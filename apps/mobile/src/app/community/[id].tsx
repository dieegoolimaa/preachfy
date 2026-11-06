import type { Study } from '@preachfy/core';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Card, Field, Group, Hint, Pill, Screen, Segmented, ui } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { paper, serif, serifBold } from '@/lib/theme';
import { authClient } from '@/lib/auth';
import { call, type CommunityEvent, type Detail, type Post } from '@/lib/community';
import { dateTime, fromInput } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { goBack } from '@/lib/navigation';
import { requirePro } from '@/lib/pro';
import { saveStudy, useReader } from '@/lib/store';
import { WEB_URL } from '@/lib/live';

type Tab = 'feed' | 'agenda' | 'members';
type Report = { postId: string; text: string; reason: string };

export default function CommunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useT();
  const { data: session } = authClient.useSession();
  const { studies } = useReader();
  const [detail, setDetail] = useState<Detail | null | undefined>(undefined);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<Tab>('feed');
  const [text, setText] = useState('');
  const [notice, setNotice] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attached, setAttached] = useState<Study | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventPlace, setEventPlace] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [feedback, setFeedback] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const wide = width >= 900;

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

  const publish = async () => {
    // Personal marks and the date stay with the author; the team receives the material.
    const { snapshot: _snapshot, scheduledFor: _date, ...shared } = attached ?? ({} as Study);
    const attachment = attached ? { title: attached.title, study: shared } : undefined;
    const done = await act(`${base}/posts`, 'POST', { text, kind: notice ? 'notice' : 'post', attachment });
    if (done) {
      setText('');
      setNotice(false);
      setAttached(null);
    }
  };

  const copyStudy = (post: Post) => {
    if (!requirePro('create')) return;
    const study = post.attachment!.study as Study;
    const copy = { ...study, id: newId(), createdAt: Date.now() };
    saveStudy(copy);
    router.push(`/study/${copy.id}`);
  };

  const createEvent = async () => {
    const startsAt = fromInput(eventDate);
    if (startsAt === undefined) {
      setFeedback(t('dateInvalid'));
      return;
    }
    const done = await act(`${base}/events`, 'POST', { title: eventTitle, startsAt, place: eventPlace, meetLink: eventLink });
    if (done) {
      setEventTitle('');
      setEventDate('');
      setEventPlace('');
      setEventLink('');
    }
  };

  const invite = async () => {
    const link = `${WEB_URL}/join/${detail.inviteCode}`;
    await Clipboard.setStringAsync(t('inviteMessage', { name: detail.name, code: detail.inviteCode ?? '', link }));
    setFeedback(t('copied'));
  };

  const nextEvent = events.find((e) => e.startsAt >= Date.now() - 3_600_000);
  const meeting = nextEvent ? (
    <View style={c.next} testID="next-meeting">
      <Text style={c.nextTag}>{t('nextMeeting').toUpperCase()}</Text>
      <Text style={c.nextTitle}>{nextEvent.title}</Text>
      <Text style={c.nextWhen}>{dateTime(nextEvent.startsAt, locale)}{nextEvent.place ? ` · ${nextEvent.place}` : ''}</Text>
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
  ) : null;

  const feed = (
    <>
      <View style={c.composer}>
        {wide ? <Avatar name={session?.user.name ?? '?'} /> : null}
        <View style={c.composerBody}>
          <Field testID="post-text" multiline value={text} onChangeText={setText} placeholder={t('postHint')} />
          <View style={ui.row}>
            {leader ? <Pill testID="post-notice" primary={notice} label={t('notice')} onPress={() => setNotice(!notice)} /> : null}
            <Pill testID="post-attach" primary={Boolean(attached)} label={attached?.title ?? t('attachStudy')} onPress={() => (attached ? setAttached(null) : setAttaching(!attaching))} />
            <Pill testID="post-send" primary disabled={!text.trim() && !attached} label={t('publish')} onPress={publish} />
          </View>
          {attaching && !attached
            ? studies.filter((x) => !x.deletedAt).map((study) => (
                <Pill key={study.id} testID="attach-option" label={study.title} onPress={() => { setAttached(study); setAttaching(false); }} />
              ))
            : null}
        </View>
      </View>

      {leader && reports.length ? <Group title={t('reports')} /> : null}
      {reports.map((report) => (
        <Card key={report.postId} testID="report-row">
          <Text style={c.body}>{report.text}</Text>
          {report.reason ? <Hint>{report.reason}</Hint> : null}
          <Pill plain testID="report-remove" label={t('removePost')} onPress={() => act(`${base}/posts/${report.postId}`, 'DELETE')} />
        </Card>
      ))}

      {posts.map((post) => (
        <View key={post.id} testID="post-row" style={[c.post, post.kind === 'notice' && c.postNotice]}>
          <Avatar name={post.authorName} />
          <View style={c.postBody}>
            <View style={c.postHead}>
              <Text style={c.author} numberOfLines={1}>{post.authorName}</Text>
              {post.kind === 'notice' ? <Text style={c.noticeTag}>{t('notice')}</Text> : null}
              <Text style={c.time}>{dateTime(post.createdAt, locale)}</Text>
              <Pressable testID={`post-menu-${post.id}`} accessibilityRole="button" accessibilityLabel={t('moreActions')} hitSlop={10} style={c.more} onPress={() => setMenuFor(menuFor === post.id ? null : post.id)}>
                <Icon name="more" size={20} color={paper.muted} />
              </Pressable>
            </View>
            {post.text ? <Text style={c.body}>{post.text}</Text> : null}
            {post.attachment ? (
              <View style={c.attach} testID="attachment">
                <Text style={c.attachTag}>{t('sharedStudy').toUpperCase()}</Text>
                <Text style={ui.cardTitle}>{post.attachment.title}</Text>
                <Pill testID="copy-attachment" primary label={t('copyToMine')} onPress={() => copyStudy(post)} />
              </View>
            ) : null}
            {post.kind === 'notice' ? (
              <View style={c.start}><Pill plain testID="seen" disabled={post.seenByMe} label={post.seenByMe ? `✓ ${t('seenCount', { n: post.seenCount })}` : t('seenCount', { n: post.seenCount })} onPress={() => act(`${base}/posts/${post.id}/seen`)} /></View>
            ) : null}
            {menuFor === post.id ? (
              <View style={c.menu} testID="post-menu">
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
      ))}
      {posts.length === 0 ? <Hint testID="feed-empty">{t('feedEmpty')}</Hint> : null}
    </>
  );

  const agenda = (
    <>
      {leader ? (
        <Card>
          <Field testID="event-title" value={eventTitle} onChangeText={setEventTitle} placeholder={t('eventTitle')} />
          <Field testID="event-date" value={eventDate} onChangeText={setEventDate} placeholder="2026-11-08 19:30" />
          <Field testID="event-place" value={eventPlace} onChangeText={setEventPlace} placeholder={t('placeLabel')} />
          <Field testID="event-link" value={eventLink} onChangeText={setEventLink} placeholder="https://" autoCapitalize="none" />
          <Pill testID="event-create" primary disabled={!eventTitle.trim()} label={t('schedule')} onPress={createEvent} />
        </Card>
      ) : null}
      {events.map((event) => {
        const day = new Date(event.startsAt);
        return (
          <View key={event.id} testID="event-row" style={c.event}>
            <View style={c.date}>
              <Text style={c.dateDay}>{day.getDate()}</Text>
              <Text style={c.dateMonth}>{day.toLocaleDateString(locale, { month: 'short' }).replace('.', '').toUpperCase()}</Text>
            </View>
            <View style={c.eventBody}>
              <Text style={ui.cardTitle}>{event.title}</Text>
              <Text style={c.time}>{day.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}{event.place ? ` · ${event.place}` : ''}</Text>
              <View style={ui.row}>
                <Pill plain testID="rsvp" primary={event.goingByMe} label={t('goingCount', { n: event.goingCount })} onPress={() => act(`${base}/events/${event.id}/rsvp`, 'POST', { going: !event.goingByMe })} />
                {event.meetLink ? <Pill plain label={t('openLink')} onPress={() => Linking.openURL(event.meetLink!)} /> : null}
                {leader ? <Pill plain danger testID="event-delete" label={t('remove')} onPress={() => act(`${base}/events/${event.id}`, 'DELETE')} /> : null}
              </View>
            </View>
          </View>
        );
      })}
      {events.length === 0 ? <Hint testID="agenda-empty">{t('agendaEmpty')}</Hint> : null}
    </>
  );

  const members = (
    <>
      {detail.inviteCode ? (
        <View style={c.invite} testID="invite">
          <Text style={c.nextTag}>{t('inviteCode').toUpperCase()}</Text>
          <Text testID="invite-code" style={c.code}>{detail.inviteCode}</Text>
          <View style={ui.row}>
            <Pill primary testID="copy-invite" label={t('copyInvite')} onPress={invite} />
            <Pill plain testID="rotate-invite" label={t('newInvite')} onPress={() => act(`${base}/invite`)} />
          </View>
        </View>
      ) : null}
      {detail.members.map((member) => (
        <View key={member.userId} testID="member-row" style={c.member}>
          <Avatar name={member.name} />
          <View style={c.postBody}>
            <View style={c.postHead}>
              <Text style={c.author}>{member.name}</Text>
              {member.role === 'leader' ? <Text style={c.noticeTag}>{t('leader')}</Text> : null}
            </View>
            {member.userId !== session?.user.id && !member.isOwner ? (
              <View style={ui.row}>
                {detail.isOwner ? (
                  <Pill plain testID="toggle-leader" label={t(member.role === 'leader' ? 'makeMember' : 'makeLeader')} onPress={() => act(`${base}/members/${member.userId}`, 'PATCH', { role: member.role === 'leader' ? 'member' : 'leader' })} />
                ) : null}
                {leader ? <Pill plain danger testID="remove-member" label={t('remove')} onPress={() => act(`${base}/members/${member.userId}`, 'DELETE')} /> : null}
              </View>
            ) : null}
          </View>
        </View>
      ))}
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
    <Segmented
      value={tab}
      onChange={setTab}
      options={(['feed', 'agenda', 'members'] as const).map((key) => ({ key, label: t(key), testID: `ctab-${key}` }))}
    />
  );
  const content = tab === 'feed' ? feed : tab === 'agenda' ? agenda : members;

  return (
    <Screen title={detail.name} close testID="community-detail" wide>
      {detail.description ? <Text testID="community-description" style={c.description}>{detail.description}</Text> : null}
      {feedback ? <Text testID="community-feedback" style={ui.error}>{feedback}</Text> : null}
      {wide ? (
        <View style={c.columns}>
          <View style={c.main}>{tabs}{content}</View>
          <View style={c.side}>
            {meeting}
            <Text style={c.nextTag}>{t('members').toUpperCase()} · {detail.members.length}</Text>
            {detail.members.slice(0, 8).map((member) => (
              <View key={member.userId} style={c.sideMember}>
                <Avatar name={member.name} small />
                <Text style={c.sideName}>{member.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <>
          {meeting}
          {tabs}
          {content}
        </>
      )}
    </Screen>
  );
}

const tints = ['#FFE98A', '#CFE3FF', '#D5F0DD', '#F6D6E0', '#E4DAF7'];

/** The first letter on a soft color: enough to tell people apart without photos. */
function Avatar({ name, small }: { name: string; small?: boolean }) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const size = small ? 28 : 40;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tints[hash % tints.length], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: small ? 13 : 17, fontWeight: '700', color: paper.fg }}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const c = StyleSheet.create({
  description: { fontSize: 16, lineHeight: 23, color: paper.muted },
  columns: { flexDirection: 'row', gap: 28, alignItems: 'flex-start' },
  main: { flex: 2, gap: 14 },
  side: { flex: 1, gap: 12 },
  sideMember: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sideName: { fontSize: 15, color: paper.fg },
  next: { gap: 6, padding: 18, borderRadius: 20, backgroundColor: '#FFE485' },
  nextTag: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: paper.muted },
  nextTitle: { fontFamily: serifBold, fontSize: 24, lineHeight: 28, color: paper.fg },
  nextWhen: { fontSize: 15, color: '#3A3320' },
  composer: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  composerBody: { flex: 1, gap: 10 },
  post: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paper.line },
  postNotice: { backgroundColor: '#FFF8DA', paddingHorizontal: 12, borderRadius: 14, borderTopWidth: 0 },
  postBody: { flex: 1, gap: 8 },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  author: { fontSize: 16, fontWeight: '600', color: paper.fg, flexShrink: 1 },
  noticeTag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: '#16181D', backgroundColor: '#FFD43B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  time: { flex: 1, fontSize: 13, color: paper.muted },
  more: { padding: 2 },
  body: { fontSize: 17, lineHeight: 25, color: paper.fg, textAlign: 'left' },
  attach: { gap: 8, padding: 14, borderRadius: 14, backgroundColor: paper.soft },
  attachTag: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: paper.muted },
  start: { alignItems: 'flex-start' },
  menu: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  event: { flexDirection: 'row', gap: 14, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paper.line },
  date: { width: 56, height: 62, borderRadius: 14, backgroundColor: paper.soft, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontFamily: serifBold, fontSize: 26, lineHeight: 28, color: paper.fg },
  dateMonth: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: paper.muted },
  eventBody: { flex: 1, gap: 6 },
  invite: { gap: 8, padding: 18, borderRadius: 18, backgroundColor: paper.soft },
  code: { fontFamily: serif, fontSize: 34, letterSpacing: 4, color: paper.fg },
  member: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10 },
});
