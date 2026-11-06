import type { Study } from '@preachfy/core';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Field, Hint, Pill, Screen, ui } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { call, type CommunityEvent, type Detail, type Member, type Post } from '@/lib/community';
import { dateTime } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { WEB_URL } from '@/lib/live';
import { goBack } from '@/lib/navigation';
import { requirePro } from '@/lib/pro';
import { setShared, sharedId } from '@/lib/shared';
import { saveStudy, useReader } from '@/lib/store';
import { paper, serif, serifBold } from '@/lib/theme';

type Tab = 'home' | 'feed' | 'agenda' | 'members';
type Report = { postId: string; text: string; reason: string };

const tints = ['#FFE98A', '#CFE3FF', '#D5F0DD', '#F6D6E0', '#E4DAF7'];
const times = ['07:00', '09:00', '18:00', '19:00', '19:30', '20:00'];

/** The first letter on a soft color: enough to tell people apart without photos. */
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tints[hash % tints.length], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.42, fontWeight: '700', color: paper.fg }}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/** A few faces side by side, so a group looks like people. */
function Faces({ members }: { members: Member[] }) {
  return (
    <View style={s.faces}>
      {members.slice(0, 5).map((member, index) => (
        <View key={member.userId} style={[s.face, index > 0 && s.faceOverlap]}>
          <Avatar name={member.name} size={32} />
        </View>
      ))}
    </View>
  );
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export default function CommunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useT();
  const { data: session } = authClient.useSession();
  const { studies } = useReader();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [detail, setDetail] = useState<Detail | null | undefined>(undefined);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<Tab>('home');
  const [text, setText] = useState('');
  const [notice, setNotice] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attached, setAttached] = useState<Study | null>(null);
  const [replying, setReplying] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDay, setEventDay] = useState(0);
  const [eventTime, setEventTime] = useState('19:30');
  const [eventPlace, setEventPlace] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [feedback, setFeedback] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [instant, setInstant] = useState(false);
  const [instantLink, setInstantLink] = useState('');

  const base = `/communities/${id}`;
  const load = useCallback(async () => {
    const found = await call<Detail>(base);
    setDetail(found);
    if (!found) return;
    const [feed, agenda, flagged] = await Promise.all([
      call<Post[]>(`${base}/posts`),
      call<CommunityEvent[]>(`${base}/events`),
      found.role === 'leader' ? call<Report[]>(`${base}/reports`) : Promise.resolve([]),
    ]);
    if (feed) setPosts(feed);
    if (agenda) setEvents(agenda);
    if (flagged) setReports(flagged);
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => new Date(startOfDay(new Date()).getTime() + i * 86_400_000)), []);

  if (detail === undefined) return <Screen title={t('community')} close>{null}</Screen>;
  if (detail === null) {
    return (
      <Screen title={t('community')} close>
        <Hint testID="community-missing">{t('nothing')}</Hint>
      </Screen>
    );
  }

  const leader = detail.role === 'leader';
  const act = async (path: string, method = 'POST', body?: unknown) => {
    const done = await call(path, method, body);
    setFeedback(done ? '' : t('offline'));
    await load();
    return done;
  };

  const roots = posts.filter((post) => !post.replyTo);
  const repliesOf = (post: Post) => posts.filter((reply) => reply.replyTo === post.id).sort((a, b) => a.createdAt - b.createdAt);
  const weekPost = roots.find((post) => post.attachment);
  const latestNotice = roots.find((post) => post.kind === 'notice');
  const nextEvent = events.find((event) => event.startsAt >= Date.now() - 3_600_000);
  const upcoming = events.filter((event) => event.startsAt >= Date.now() - 3_600_000);
  const people = detail.members.length === 1 ? t('peopleOne') : t('peopleMany', { n: detail.members.length });

  const publish = async () => {
    // Personal marks and the date stay with the author; the team receives the material.
    const { snapshot: _snapshot, scheduledFor: _date, example: _example, ...shared } = attached ?? ({} as Study);
    const attachment = attached ? { title: attached.title, study: shared } : undefined;
    const done = await act(`${base}/posts`, 'POST', { text, kind: notice ? 'notice' : 'post', attachment });
    if (done) {
      setText('');
      setNotice(false);
      setAttached(null);
      setAttaching(false);
    }
  };

  const sendReply = async (post: Post) => {
    if (!replyText.trim()) return;
    const done = await act(`${base}/posts`, 'POST', { text: replyText, replyTo: post.id });
    if (done) {
      setReplyText('');
      setReplying(null);
    }
  };

  const copyStudy = (post: Post) => {
    if (!requirePro('create')) return;
    const study = post.attachment!.study as Study;
    const copy = { ...study, id: newId(), createdAt: Date.now() };
    saveStudy(copy);
    router.push(`/study/${copy.id}`);
  };

  const follow = (post: Post) => {
    const shared = sharedId(post.id);
    setShared(shared, { ...(post.attachment!.study as Study), id: shared });
    router.push(`/pulpit?id=${shared}`);
  };

  const createEvent = async () => {
    const [hours, minutes] = eventTime.split(':').map(Number);
    if (!eventTitle.trim() || hours === undefined || minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) {
      setFeedback(t('dateInvalid'));
      return;
    }
    const startsAt = new Date(days[eventDay]!.getTime() + (hours * 60 + minutes) * 60_000).getTime();
    const done = await act(`${base}/events`, 'POST', { title: eventTitle, startsAt, place: eventPlace, meetLink: eventLink });
    if (done) {
      setEventTitle('');
      setEventPlace('');
      setEventLink('');
      setEventDay(0);
      setCreating(false);
    }
  };

  /** Google Meet makes the room; the leader copies its link and pastes it here. */
  const openMeet = () => Linking.openURL('https://meet.google.com/new').catch(() => setFeedback(t('offline')));
  const pasteLink = async (set: (link: string) => void) => {
    const pasted = (await Clipboard.getStringAsync().catch(() => '')).trim();
    if (/^https?:\/\/\S+$/.test(pasted)) {
      set(pasted);
      setFeedback('');
    } else setFeedback(t('linkInvalid'));
  };
  const startNow = () => {
    setInstant(true);
    openMeet();
  };
  const announceNow = async () => {
    if (!/^https?:\/\/\S+$/.test(instantLink.trim())) {
      setFeedback(t('linkInvalid'));
      return;
    }
    const event = await act(`${base}/events`, 'POST', { title: t('meetNow'), startsAt: Date.now(), meetLink: instantLink.trim() });
    if (event) {
      await act(`${base}/posts`, 'POST', { text: `${t('meetNowNotice')} ${instantLink.trim()}`, kind: 'notice' });
      setInstant(false);
      setInstantLink('');
      setTab('home');
    }
  };

  const invite = async () => {
    const link = `${WEB_URL}/join/${detail.inviteCode}`;
    await Share.share({ message: t('inviteMessage', { name: detail.name, code: detail.inviteCode ?? '', link }) });
  };

  const weekCard = weekPost?.attachment ? (
    <View style={s.week} testID="week-study">
      <Text style={s.tag}>{t('weekStudy').toUpperCase()}</Text>
      <Text style={s.weekTitle}>{weekPost.attachment.title}</Text>
      {weekPost.text ? <Text style={s.weekText} numberOfLines={3}>{weekPost.text}</Text> : null}
      <View style={ui.row}>
        <Pill primary testID="week-follow" label={t('followInPulpit')} onPress={() => follow(weekPost)} />
        <Pill plain testID="week-copy" label={t('copyToMine')} onPress={() => copyStudy(weekPost)} />
      </View>
    </View>
  ) : leader ? (
    <Pressable
      style={s.invitation}
      testID="week-empty"
      onPress={() => {
        setTab('feed');
        setAttaching(true);
      }}>
      <Text style={s.invitationTitle}>{t('shareWeekTitle')}</Text>
      <Text style={s.invitationText}>{t('shareWeekHint')}</Text>
    </Pressable>
  ) : null;

  const meetingCard = nextEvent ? (
    <View style={s.meeting} testID="next-meeting">
      <Text style={s.tag}>{t('nextMeeting').toUpperCase()}</Text>
      <Text style={s.weekTitle}>{nextEvent.title}</Text>
      <Text style={s.when}>{dateTime(nextEvent.startsAt, locale)}{nextEvent.place ? ` · ${nextEvent.place}` : ''}</Text>
      <View style={ui.row}>
        <Pill
          primary={!nextEvent.goingByMe}
          testID="next-rsvp"
          label={nextEvent.goingByMe ? `✓ ${t('goingCount', { n: nextEvent.goingCount })}` : t('goingCount', { n: nextEvent.goingCount })}
          onPress={() => act(`${base}/events/${nextEvent.id}/rsvp`, 'POST', { going: !nextEvent.goingByMe })}
        />
        {nextEvent.meetLink ? <Pill plain label={t('openLink')} onPress={() => Linking.openURL(nextEvent.meetLink!)} /> : null}
      </View>
    </View>
  ) : leader ? (
    <Pressable
      style={s.invitation}
      testID="meeting-empty"
      onPress={() => {
        setTab('agenda');
        setCreating(true);
      }}>
      <Text style={s.invitationTitle}>{t('scheduleTitle')}</Text>
    </Pressable>
  ) : null;

  const noticeCard = latestNotice ? (
    <View style={s.noticeCard} testID="latest-notice">
      <View style={s.line}>
        <Text style={s.noticeTag}>{t('notice')}</Text>
        <Text style={s.time}>{latestNotice.authorName} · {dateTime(latestNotice.createdAt, locale)}</Text>
      </View>
      <Text style={s.body}>{latestNotice.text}</Text>
      <View style={s.start}>
        <Pill plain testID="seen-home" disabled={latestNotice.seenByMe} label={latestNotice.seenByMe ? `✓ ${t('seenCount', { n: latestNotice.seenCount })}` : t('seenCount', { n: latestNotice.seenCount })} onPress={() => act(`${base}/posts/${latestNotice.id}/seen`)} />
      </View>
    </View>
  ) : null;

  const recent = roots.filter((post) => post.kind === 'post' && !post.attachment).slice(0, 3);

  const home = (
    <>
      {weekCard}
      {noticeCard}
      {wide ? null : meetingCard}
      <View style={s.sectionHead}>
        <Text style={s.section}>{t('recentTalk').toUpperCase()}</Text>
        <Pressable accessibilityRole="button" onPress={() => setTab('feed')}><Text style={s.link}>{t('seeAll')}</Text></Pressable>
      </View>
      {recent.length === 0 ? <Hint testID="feed-empty-home">{t('noTalk')}</Hint> : null}
      {recent.map((post) => (
        <View key={post.id} style={s.recent}>
          <Avatar name={post.authorName} size={32} />
          <View style={s.postBody}>
            <Text style={s.author}>{post.authorName}</Text>
            <Text style={s.body} numberOfLines={3}>{post.text}</Text>
          </View>
        </View>
      ))}
    </>
  );

  const postCard = (post: Post, reply = false) => (
    <View key={post.id} testID={reply ? 'reply-row' : 'post-row'} style={[s.post, reply && s.reply, post.kind === 'notice' && s.postNotice]}>
      <Avatar name={post.authorName} size={reply ? 30 : 40} />
      <View style={s.postBody}>
        <View style={s.line}>
          <Text style={s.author} numberOfLines={1}>{post.authorName}</Text>
          {post.kind === 'notice' ? <Text style={s.noticeTag}>{t('notice')}</Text> : null}
          <Text style={s.time}>{dateTime(post.createdAt, locale)}</Text>
          <Pressable testID={`post-menu-${post.id}`} accessibilityRole="button" accessibilityLabel={t('moreActions')} hitSlop={10} onPress={() => setMenuFor(menuFor === post.id ? null : post.id)}>
            <Icon name="more" size={20} color={paper.muted} />
          </Pressable>
        </View>
        {post.text ? <Text style={s.body}>{post.text}</Text> : null}
        {post.attachment ? (
          <View style={s.attach} testID="attachment">
            <Text style={s.tag}>{t('sharedStudy').toUpperCase()}</Text>
            <Text style={ui.cardTitle}>{post.attachment.title}</Text>
            <View style={ui.row}>
              <Pill primary testID="follow-attachment" label={t('followInPulpit')} onPress={() => follow(post)} />
              <Pill plain testID="copy-attachment" label={t('copyToMine')} onPress={() => copyStudy(post)} />
            </View>
          </View>
        ) : null}
        <View style={s.actions}>
          {post.kind === 'notice' ? (
            <Pill plain testID="seen" disabled={post.seenByMe} label={post.seenByMe ? `✓ ${t('seenCount', { n: post.seenCount })}` : t('seenCount', { n: post.seenCount })} onPress={() => act(`${base}/posts/${post.id}/seen`)} />
          ) : (
            <Pill plain testID="amen" primary={post.amenByMe} label={post.amenCount ? `${t('amen')} · ${post.amenCount}` : t('amen')} onPress={() => act(`${base}/posts/${post.id}/amen`)} />
          )}
          {!reply && post.kind === 'post' ? <Pill plain testID="reply" label={t('reply')} onPress={() => setReplying(replying === post.id ? null : post.id)} /> : null}
        </View>
        {menuFor === post.id ? (
          <View style={s.menu} testID="post-menu">
            {post.mine || leader ? <Pill plain danger testID="delete-post" label={t('remove')} onPress={() => { setMenuFor(null); act(`${base}/posts/${post.id}`, 'DELETE'); }} /> : null}
            {post.mine ? null : (
              <>
                <Pill plain testID="report-post" label={t('report')} onPress={async () => { setMenuFor(null); await act(`${base}/posts/${post.id}/report`, 'POST', { reason: '' }); setFeedback(t('reported')); }} />
                <Pill plain danger testID="block-user" label={t('block')} onPress={() => { setMenuFor(null); act('/blocks', 'POST', { userId: post.authorId }); }} />
              </>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );

  const feed = (
    <>
      <View style={s.composer}>
        <TextInput
          testID="post-text"
          style={s.composerInput}
          multiline
          value={text}
          onChangeText={setText}
          placeholder={t('postHint')}
          placeholderTextColor={paper.muted}
        />
        <View style={s.composerBar}>
          <View style={s.composerTools}>
            {leader ? <Pill testID="post-notice" primary={notice} label={t('notice')} onPress={() => setNotice(!notice)} /> : null}
            <Pill testID="post-attach" primary={Boolean(attached)} label={attached?.title ?? t('attachStudy')} onPress={() => (attached ? setAttached(null) : setAttaching(!attaching))} />
          </View>
          <Pill testID="post-send" primary disabled={!text.trim() && !attached} label={t('publish')} onPress={publish} />
        </View>
        {attaching && !attached
          ? studies.filter((x) => !x.deletedAt).map((study) => (
              <Pill key={study.id} testID="attach-option" label={study.title} onPress={() => { setAttached(study); setAttaching(false); }} />
            ))
          : null}
      </View>

      {leader && reports.length ? <Text style={s.section}>{t('reports').toUpperCase()}</Text> : null}
      {reports.map((report) => (
        <View key={report.postId} testID="report-row" style={s.attach}>
          <Text style={s.body}>{report.text}</Text>
          {report.reason ? <Hint>{report.reason}</Hint> : null}
          <Pill plain testID="report-remove" label={t('removePost')} onPress={() => act(`${base}/posts/${report.postId}`, 'DELETE')} />
        </View>
      ))}

      {roots.map((post) => (
        <View key={post.id}>
          {postCard(post)}
          {repliesOf(post).map((reply) => postCard(reply, true))}
          {replying === post.id ? (
            <View style={s.replyBox}>
              <TextInput testID="reply-input" style={s.replyInput} value={replyText} onChangeText={setReplyText} placeholder={t('replyHint')} placeholderTextColor={paper.muted} multiline />
              <Pill primary testID="reply-send" disabled={!replyText.trim()} label={t('publish')} onPress={() => sendReply(post)} />
            </View>
          ) : null}
        </View>
      ))}
      {roots.length === 0 ? <Hint testID="feed-empty">{t('feedEmpty')}</Hint> : null}
    </>
  );

  const agenda = (
    <>
      {leader ? (
        creating ? (
          <View style={s.form} testID="event-form">
            <Field testID="event-title" value={eventTitle} onChangeText={setEventTitle} placeholder={t('eventTitle')} />
            <Text style={s.section}>{t('whichDay').toUpperCase()}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {days.map((day, index) => (
                <Pressable key={index} testID={`event-day-${index}`} accessibilityRole="button" style={[s.chip, index === eventDay && s.chipOn]} onPress={() => setEventDay(index)}>
                  <Text style={[s.chipSmall, index === eventDay && s.chipTextOn]}>{index === 0 ? t('today') : index === 1 ? t('tomorrow') : day.toLocaleDateString(locale, { weekday: 'short' })}</Text>
                  <Text style={[s.chipBig, index === eventDay && s.chipTextOn]}>{day.getDate()}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={s.section}>{t('whatTime').toUpperCase()}</Text>
            <View style={s.chips}>
              {times.map((time) => (
                <Pressable key={time} testID={`event-time-${time}`} accessibilityRole="button" style={[s.timeChip, eventTime === time && s.chipOn]} onPress={() => setEventTime(time)}>
                  <Text style={[s.chipBig, eventTime === time && s.chipTextOn]}>{time}</Text>
                </Pressable>
              ))}
              <TextInput testID="event-time" style={s.timeInput} value={eventTime} onChangeText={setEventTime} placeholder="HH:MM" placeholderTextColor={paper.muted} keyboardType="numbers-and-punctuation" />
            </View>
            <Field testID="event-place" value={eventPlace} onChangeText={setEventPlace} placeholder={t('placeLabel')} />
            <Field testID="event-link" value={eventLink} onChangeText={setEventLink} placeholder={t('optionalLink')} autoCapitalize="none" />
            <View style={s.actions}>
              <Pill plain testID="event-meet" label={t('meetCreate')} onPress={openMeet} />
              <Pill plain testID="event-paste" label={t('pasteLink')} onPress={() => pasteLink(setEventLink)} />
            </View>
            <View style={ui.row}>
              <Pill testID="event-create" primary disabled={!eventTitle.trim()} label={t('schedule')} onPress={createEvent} />
              <Pill plain label={t('cancel')} onPress={() => setCreating(false)} />
            </View>
          </View>
        ) : (
          <View style={s.actions0}>
            <Pill testID="event-new" primary big label={t('newMeeting')} onPress={() => setCreating(true)} />
            <Pill testID="meet-now" big label={t('meetNow')} onPress={startNow} />
          </View>
        )
      ) : null}
      {leader && instant ? (
        <View style={s.form} testID="instant-card">
          <Text style={s.invitationTitle}>{t('meetNow')}</Text>
          <Text style={s.invitationText}>{t('meetNowHint')}</Text>
          <Field testID="instant-link" value={instantLink} onChangeText={setInstantLink} placeholder="https://meet.google.com/…" autoCapitalize="none" />
          <View style={ui.row}>
            <Pill plain testID="instant-paste" label={t('pasteLink')} onPress={() => pasteLink(setInstantLink)} />
            <Pill testID="instant-send" primary disabled={!instantLink.trim()} label={t('meetNowSend')} onPress={announceNow} />
          </View>
        </View>
      ) : null}
      {upcoming.length ? <Text style={s.section}>{t('upcoming').toUpperCase()}</Text> : null}
      {upcoming.map((event) => {
        const day = new Date(event.startsAt);
        return (
          <View key={event.id} testID="event-row" style={s.event}>
            <View style={s.date}>
              <Text style={s.dateDay}>{day.getDate()}</Text>
              <Text style={s.dateMonth}>{day.toLocaleDateString(locale, { month: 'short' }).replace('.', '').toUpperCase()}</Text>
            </View>
            <View style={s.postBody}>
              <Text style={ui.cardTitle}>{event.title}</Text>
              <Text style={s.when}>{day.toLocaleDateString(locale, { weekday: 'long' })} · {day.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}{event.place ? ` · ${event.place}` : ''}</Text>
              <View style={s.actions}>
                <Pill testID="rsvp" primary={event.goingByMe} label={event.goingByMe ? `✓ ${t('goingCount', { n: event.goingCount })}` : t('goingCount', { n: event.goingCount })} onPress={() => act(`${base}/events/${event.id}/rsvp`, 'POST', { going: !event.goingByMe })} />
                {event.meetLink ? <Pill plain label={t('openLink')} onPress={() => Linking.openURL(event.meetLink!)} /> : null}
                {leader ? <Pill plain danger testID="event-delete" label={t('remove')} onPress={() => act(`${base}/events/${event.id}`, 'DELETE')} /> : null}
              </View>
            </View>
          </View>
        );
      })}
      {upcoming.length === 0 ? <Hint testID="agenda-empty">{t('noMeetings')}</Hint> : null}
    </>
  );

  const leaders = detail.members.filter((member) => member.role === 'leader');
  const others = detail.members.filter((member) => member.role !== 'leader');
  const memberRow = (member: Member) => (
    <View key={member.userId} testID="member-row" style={s.member}>
      <Avatar name={member.name} />
      <View style={s.postBody}>
        <Text style={s.author}>{member.name}</Text>
        {member.userId !== session?.user.id && !member.isOwner ? (
          <View style={s.actions}>
            {detail.isOwner ? (
              <Pill plain testID="toggle-leader" label={t(member.role === 'leader' ? 'makeMember' : 'makeLeader')} onPress={() => act(`${base}/members/${member.userId}`, 'PATCH', { role: member.role === 'leader' ? 'member' : 'leader' })} />
            ) : null}
            {leader ? <Pill plain danger testID="remove-member" label={t('remove')} onPress={() => act(`${base}/members/${member.userId}`, 'DELETE')} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );

  const membersView = (
    <>
      {detail.inviteCode ? (
        <View style={s.inviteCard} testID="invite">
          <Text style={s.tag}>{t('inviteCode').toUpperCase()}</Text>
          <Text testID="invite-code" style={s.code}>{detail.inviteCode}</Text>
          <View style={ui.row}>
            <Pill primary testID="copy-invite" label={t('shareInvite')} onPress={invite} />
            <Pill plain testID="rotate-invite" label={t('newInvite')} onPress={() => act(`${base}/invite`)} />
          </View>
        </View>
      ) : null}
      <Text style={s.section}>{t('leadersTitle').toUpperCase()}</Text>
      {leaders.map(memberRow)}
      {others.length ? <Text style={s.section}>{t('members').toUpperCase()}</Text> : null}
      {others.map(memberRow)}
      {leaving ? (
        <View style={ui.row}>
          <Pill
            testID="confirm-leave"
            primary
            label={t(detail.isOwner ? 'confirmDeleteCommunity' : 'confirmLeave')}
            onPress={async () => {
              const done = detail.isOwner ? await call(base, 'DELETE') : await call(`${base}/members/${session?.user.id}`, 'DELETE');
              if (done) goBack();
              else setFeedback(t('offline'));
            }}
          />
          <Pill plain label={t('cancel')} onPress={() => setLeaving(false)} />
        </View>
      ) : (
        <Pill plain danger testID="leave" label={t(detail.isOwner ? 'deleteCommunity' : 'leaveCommunity')} onPress={() => setLeaving(true)} />
      )}
    </>
  );

  const tabs = (
    <View style={s.tabs}>
      {([['home', 'tabHome'], ['feed', 'tabTalk'], ['agenda', 'tabMeetings'], ['members', 'tabPeople']] as const).map(([key, label]) => (
        <Pressable key={key} testID={`ctab-${key}`} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} style={[s.tab, tab === key && s.tabOn]} onPress={() => setTab(key)}>
          <Text style={[s.tabText, tab === key && s.tabTextOn]}>{t(label)}</Text>
        </Pressable>
      ))}
    </View>
  );
  const content = tab === 'home' ? home : tab === 'feed' ? feed : tab === 'agenda' ? agenda : membersView;

  const header = (
    <View style={s.header} testID="community-header">
      {detail.description ? <Text testID="community-description" style={s.description}>{detail.description}</Text> : null}
      <View style={s.peopleRow}>
        <Pressable accessibilityRole="button" style={s.peopleLink} onPress={() => setTab('members')}>
          <Faces members={detail.members} />
          <Text style={s.peopleText}>{people}</Text>
        </Pressable>
        {detail.inviteCode ? <Pill testID="invite-top" plain label={t('invitePeople')} onPress={invite} /> : null}
      </View>
    </View>
  );

  return (
    <Screen title={detail.name} close testID="community-detail" wide>
      {header}
      {feedback ? <Text testID="community-feedback" style={ui.error}>{feedback}</Text> : null}
      {wide ? (
        <View style={s.columns}>
          <View style={s.main}>{tabs}{content}</View>
          <View style={s.side}>{meetingCard}</View>
        </View>
      ) : (
        <>
          {tabs}
          {content}
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { gap: 10 },
  description: { fontSize: 16, lineHeight: 23, color: paper.muted },
  peopleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  peopleLink: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  peopleText: { fontSize: 15, color: paper.fg },
  faces: { flexDirection: 'row' },
  face: { borderRadius: 18, borderWidth: 2, borderColor: paper.bg },
  faceOverlap: { marginLeft: -10 },
  tabs: { flexDirection: 'row', gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: paper.line },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: paper.mark },
  tabText: { fontSize: 15, color: paper.muted },
  tabTextOn: { color: paper.fg, fontWeight: '700' },
  columns: { flexDirection: 'row', gap: 28, alignItems: 'flex-start' },
  main: { flex: 2, gap: 14 },
  side: { flex: 1, gap: 12 },
  tag: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: paper.muted },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: paper.muted, marginTop: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  link: { fontSize: 15, color: paper.fg, textDecorationLine: 'underline' },
  week: { gap: 8, padding: 18, borderRadius: 20, backgroundColor: paper.soft },
  weekTitle: { fontFamily: serifBold, fontSize: 24, lineHeight: 28, color: paper.fg },
  weekText: { fontSize: 15, lineHeight: 21, color: paper.muted },
  meeting: { gap: 6, padding: 18, borderRadius: 20, backgroundColor: '#FFE485' },
  when: { fontSize: 15, color: '#3A3320' },
  invitation: { gap: 4, padding: 18, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: paper.line },
  invitationTitle: { fontFamily: serifBold, fontSize: 20, color: paper.fg },
  invitationText: { fontSize: 15, lineHeight: 21, color: paper.muted },
  noticeCard: { gap: 8, padding: 16, borderRadius: 18, backgroundColor: '#FFF8DA' },
  noticeTag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: '#16181D', backgroundColor: '#FFD43B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { flex: 1, fontSize: 13, color: paper.muted },
  recent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  composer: { gap: 10, padding: 12, borderRadius: 18, backgroundColor: paper.soft },
  composerInput: { minHeight: 76, fontSize: 17, lineHeight: 24, color: paper.fg, textAlignVertical: 'top' },
  composerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  composerTools: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', flexShrink: 1 },
  post: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paper.line },
  reply: { marginLeft: 36, paddingVertical: 10, borderTopWidth: 0 },
  postNotice: { backgroundColor: '#FFF8DA', paddingHorizontal: 12, borderRadius: 14, borderTopWidth: 0 },
  postBody: { flex: 1, gap: 6 },
  author: { fontSize: 16, fontWeight: '600', color: paper.fg, flexShrink: 1 },
  body: { fontSize: 17, lineHeight: 25, color: paper.fg, textAlign: 'left' },
  attach: { gap: 8, padding: 14, borderRadius: 14, backgroundColor: paper.soft },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginLeft: -12 },
  start: { alignItems: 'flex-start', marginLeft: -12 },
  actions0: { gap: 10 },
  menu: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  replyBox: { marginLeft: 36, gap: 8, paddingBottom: 10 },
  replyInput: { minHeight: 56, padding: 12, borderRadius: 12, backgroundColor: paper.soft, fontSize: 16, color: paper.fg, textAlignVertical: 'top' },
  form: { gap: 12, padding: 14, borderRadius: 18, backgroundColor: paper.soft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minWidth: 56, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, backgroundColor: paper.card, borderWidth: StyleSheet.hairlineWidth, borderColor: paper.line },
  chipOn: { backgroundColor: paper.fg, borderColor: paper.fg },
  chipSmall: { fontSize: 11, fontWeight: '600', color: paper.muted, textTransform: 'uppercase' },
  chipBig: { fontSize: 17, fontWeight: '600', color: paper.fg },
  chipTextOn: { color: paper.accentFg },
  timeChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: paper.card, borderWidth: StyleSheet.hairlineWidth, borderColor: paper.line },
  timeInput: { minWidth: 84, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: paper.card, fontSize: 17, color: paper.fg },
  event: { flexDirection: 'row', gap: 14, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paper.line },
  date: { width: 56, height: 62, borderRadius: 14, backgroundColor: paper.soft, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontFamily: serifBold, fontSize: 26, lineHeight: 28, color: paper.fg },
  dateMonth: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: paper.muted },
  inviteCard: { gap: 8, padding: 18, borderRadius: 18, backgroundColor: paper.soft },
  code: { fontFamily: serif, fontSize: 34, letterSpacing: 4, color: paper.fg },
  member: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8 },
});
