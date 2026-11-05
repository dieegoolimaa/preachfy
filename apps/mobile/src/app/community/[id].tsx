import type { Study } from '@preachfy/core';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { Card, Field, Group, Hint, Pill, Screen, Segmented, ui } from '@/components/ui';
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

  return (
    <Screen title={detail.name} close testID="community-detail">
      <Segmented
        value={tab}
        onChange={setTab}
        options={(['feed', 'agenda', 'members'] as const).map((key) => ({ key, label: t(key), testID: `ctab-${key}` }))}
      />
      {feedback ? <Text testID="community-feedback" style={ui.error}>{feedback}</Text> : null}

      {tab === 'feed' ? (
        <>
          <Field testID="post-text" multiline value={text} onChangeText={setText} placeholder={t('postHint')} />
          <View style={ui.row}>
            {leader ? <Pill testID="post-notice" primary={notice} label={t('notice')} onPress={() => setNotice(!notice)} /> : null}
            <Pill testID="post-attach" primary={Boolean(attached)} label={attached?.title ?? t('attachStudy')} onPress={() => (attached ? setAttached(null) : setAttaching(!attaching))} />
            <Pill testID="post-send" primary disabled={!text.trim() && !attached} label={t('publish')} onPress={publish} />
          </View>
          {attaching && !attached
            ? studies.filter((s) => !s.deletedAt).map((study) => (
                <Pill key={study.id} testID="attach-option" label={study.title} onPress={() => { setAttached(study); setAttaching(false); }} />
              ))
            : null}

          {leader && reports.length ? <Group title={t('reports')} /> : null}
          {reports.map((report) => (
            <Card key={report.postId} testID="report-row">
              <Text style={ui.pillText}>{report.text}</Text>
              {report.reason ? <Hint>{report.reason}</Hint> : null}
              <Pill plain testID="report-remove" label={t('removePost')} onPress={() => act(`${base}/posts/${report.postId}`, 'DELETE')} />
            </Card>
          ))}

          {posts.map((post) => (
            <Card key={post.id} testID="post-row">
              <Hint>{post.authorName} · {dateTime(post.createdAt, locale)}{post.kind === 'notice' ? ` · ${t('notice')}` : ''}</Hint>
              {post.text ? <Text style={ui.pillText}>{post.text}</Text> : null}
              {post.attachment ? <Text style={ui.cardTitle}>{post.attachment.title}</Text> : null}
              <View style={ui.row}>
                {post.attachment ? <Pill plain testID="copy-attachment" label={t('copyToMine')} onPress={() => copyStudy(post)} /> : null}
                {post.kind === 'notice' ? (
                  <Pill plain testID="seen" disabled={post.seenByMe} label={t('seenCount', { n: post.seenCount })} onPress={() => act(`${base}/posts/${post.id}/seen`)} />
                ) : null}
                {post.mine || leader ? <Pill plain testID="delete-post" label={t('remove')} onPress={() => act(`${base}/posts/${post.id}`, 'DELETE')} /> : null}
                {post.mine ? null : (
                  <>
                    <Pill plain testID="report-post" label={t('report')} onPress={async () => { await act(`${base}/posts/${post.id}/report`, 'POST', { reason: '' }); setFeedback(t('reported')); }} />
                    <Pill plain testID="block-user" label={t('block')} onPress={() => act('/blocks', 'POST', { userId: post.authorId })} />
                  </>
                )}
              </View>
            </Card>
          ))}
          {posts.length === 0 ? <Hint testID="feed-empty">{t('feedEmpty')}</Hint> : null}
        </>
      ) : null}

      {tab === 'agenda' ? (
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
          {events.map((event) => (
            <Card key={event.id} testID="event-row">
              <Text style={ui.cardTitle}>{event.title}</Text>
              <Hint>{dateTime(event.startsAt, locale)}{event.place ? ` · ${event.place}` : ''}</Hint>
              <View style={ui.row}>
                <Pill
                  plain
                  testID="rsvp"
                  primary={event.goingByMe}
                  label={t('goingCount', { n: event.goingCount })}
                  onPress={() => act(`${base}/events/${event.id}/rsvp`, 'POST', { going: !event.goingByMe })}
                />
                {event.meetLink ? <Pill plain label={t('openLink')} onPress={() => Linking.openURL(event.meetLink!)} /> : null}
                {leader ? <Pill plain testID="event-delete" label={t('remove')} onPress={() => act(`${base}/events/${event.id}`, 'DELETE')} /> : null}
              </View>
            </Card>
          ))}
          {events.length === 0 ? <Hint testID="agenda-empty">{t('agendaEmpty')}</Hint> : null}
        </>
      ) : null}

      {tab === 'members' ? (
        <>
          {detail.inviteCode ? (
            <Card testID="invite">
              <Hint>{t('inviteCode')}</Hint>
              <Text testID="invite-code" style={ui.cardTitle}>{detail.inviteCode}</Text>
              <View style={ui.row}>
                <Pill plain testID="copy-invite" label={t('copyInvite')} onPress={invite} />
                <Pill plain testID="rotate-invite" label={t('newInvite')} onPress={() => act(`${base}/invite`)} />
              </View>
            </Card>
          ) : null}
          {detail.members.map((member) => (
            <Card key={member.userId} testID="member-row">
              <Text style={ui.pillText}>{member.name}</Text>
              <Hint>{t(member.role === 'leader' ? 'leader' : 'member')}</Hint>
              {member.userId !== session?.user.id && !member.isOwner ? (
                <View style={ui.row}>
                  {detail.isOwner ? (
                    <Pill
                      plain
                      testID="toggle-leader"
                      label={t(member.role === 'leader' ? 'makeMember' : 'makeLeader')}
                      onPress={() => act(`${base}/members/${member.userId}`, 'PATCH', { role: member.role === 'leader' ? 'member' : 'leader' })}
                    />
                  ) : null}
                  {leader ? <Pill plain testID="remove-member" label={t('remove')} onPress={() => act(`${base}/members/${member.userId}`, 'DELETE')} /> : null}
                </View>
              ) : null}
            </Card>
          ))}
          {leaving ? (
            <View style={ui.row}>
              <Pill
                testID="confirm-leave"
                primary
                label={t(detail.isOwner ? 'confirmDeleteCommunity' : 'confirmLeave')}
                onPress={async () => {
                  const done = detail.isOwner
                    ? await call(base, 'DELETE')
                    : await call(`${base}/members/${session?.user.id}`, 'DELETE');
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
      ) : null}
    </Screen>
  );
}
