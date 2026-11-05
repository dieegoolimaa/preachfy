import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { db } from '../database';

type Text = { label: string; body: string };
type LiveStep = Text & { id: string; title: string; question?: string };
type Live = {
  _id: string; ownerId: string; title: string; goal: string; context: Text | null; steps: LiveStep[];
  current: number; started: boolean; ended: boolean; highlight: string | null; closing: string; expiresAt: Date;
  blank?: boolean; background?: string; dim?: number;
};
type Answer = { _id: string; code: string; participantId: string; nickname: string; stepId: string; text: string; at: number; expiresAt: Date };

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_STEPS = 60;
const MAX_ANSWERS = 5000;
const DAY = 86_400_000;
const BACKGROUNDS = ['none', 'dawn', 'night', 'field'];

const lives = () => db().collection<Live>('liveSessions');
const answers = () => db().collection<Answer>('liveAnswers');

const newCode = () => [...randomBytes(CODE_LENGTH)].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');

function clean(value: unknown, max: number): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max) throw new BadRequestException('Invalid text');
  return value.trim();
}

const cleanText = (value: unknown): Text | null => {
  const text = value as Partial<Text> | null | undefined;
  return text?.body ? { label: clean(text.label, 200), body: clean(text.body, 40_000) } : null;
};

/** Copies only the public fields, so a client bug cannot publish private notes. */
function cleanSteps(value: unknown): LiveStep[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_STEPS) throw new BadRequestException('Invalid steps');
  return value.map((step: Partial<LiveStep>) => {
    const question = clean(step?.question, 1000);
    return {
      id: clean(step?.id, 100) || randomUUID(),
      title: clean(step?.title, 200),
      label: clean(step?.label, 200),
      body: clean(step?.body, 40_000),
      ...(question ? { question } : {}),
    };
  });
}

export async function deleteLiveData(userId: string) {
  const owned = await lives().find({ ownerId: userId }).map((live) => live._id).toArray();
  await answers().deleteMany({ code: { $in: owned } });
  await lives().deleteMany({ ownerId: userId });
}

@Injectable()
export class LiveService implements OnModuleInit {
  async onModuleInit() {
    await lives().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await answers().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await answers().createIndex({ code: 1, participantId: 1, stepId: 1 }, { unique: true });
  }

  private async active(code: string) {
    const live = await lives().findOne({ _id: code.toUpperCase() });
    if (!live || live.expiresAt.getTime() <= Date.now()) throw new NotFoundException();
    return live;
  }

  private async owned(code: string, userId: string) {
    const live = await this.active(code);
    if (live.ownerId !== userId) throw new NotFoundException();
    return live;
  }

  async create(userId: string, body: { title?: unknown; goal?: unknown; context?: unknown; steps?: unknown; days?: unknown }) {
    const days = Math.min(Math.max(Number(body.days) || 7, 1), 30);
    const title = clean(body.title, 200);
    if (!title) throw new BadRequestException('Invalid title');
    const live: Live = {
      _id: newCode(), ownerId: userId, title, goal: clean(body.goal, 1000), context: cleanText(body.context),
      steps: cleanSteps(body.steps), current: 0, started: false, ended: false, highlight: null, closing: '',
      expiresAt: new Date(Date.now() + days * DAY),
    };
    await lives().insertOne(live);
    return { code: live._id, expiresAt: live.expiresAt.getTime() };
  }

  /** Students see only what the teacher has reached, and the whole class once it ends. */
  async read(code: string) {
    const { _id, title, goal, context, steps, current, started, ended, highlight, closing, expiresAt, blank, background, dim } = await this.active(code);
    const reached = ended ? steps : started ? steps.slice(0, current + 1) : [];
    return {
      code: _id, title, goal, context, steps: reached, total: steps.length, current, started, ended, highlight, closing,
      expiresAt: expiresAt.getTime(), blank: blank ?? false, background: background ?? 'none', dim: dim ?? 60,
    };
  }

  async setState(code: string, userId: string, body: { current?: unknown; highlight?: unknown }) {
    const live = await this.owned(code, userId);
    const current = Number(body.current);
    if (!Number.isInteger(current) || current < 0 || current >= live.steps.length) throw new BadRequestException('Invalid step');
    await lives().updateOne({ _id: live._id }, { $set: { current, started: true, highlight: null } });
  }

  async end(code: string, userId: string, closing: unknown) {
    const live = await this.owned(code, userId);
    await lives().updateOne({ _id: live._id }, { $set: { ended: true, highlight: null, closing: clean(closing, 2000) } });
  }

  async answer(code: string, body: { participantId?: unknown; nickname?: unknown; stepId?: unknown; text?: unknown }) {
    const live = await this.active(code);
    if (live.ended) throw new ConflictException();
    const participantId = clean(body.participantId, 100);
    const stepId = clean(body.stepId, 100);
    const text = clean(body.text, 1000);
    if (!participantId || !text || !live.steps.some((s) => s.id === stepId && s.question)) throw new BadRequestException();
    if ((await answers().countDocuments({ code: live._id })) >= MAX_ANSWERS) throw new ConflictException();
    await answers().updateOne(
      { code: live._id, participantId, stepId },
      {
        $set: { text, nickname: clean(body.nickname, 40), at: Date.now(), expiresAt: live.expiresAt },
        $setOnInsert: { _id: randomUUID() },
      },
      { upsert: true },
    );
  }

  async listAnswers(code: string, userId: string, stepId: string) {
    const live = await this.owned(code, userId);
    const found = await answers().find({ code: live._id, stepId }).sort({ at: 1 }).limit(500).toArray();
    return found.map(({ _id, nickname, text, at }) => ({ id: _id, nickname, text, at }));
  }

  /** Shown to the room: an answer, without the name of who wrote it, or a verse outside the outline. */
  async highlight(code: string, userId: string, body: { answerId?: unknown; text?: unknown }) {
    const live = await this.owned(code, userId);
    const found = typeof body.answerId === 'string' ? await answers().findOne({ _id: body.answerId, code: live._id }) : null;
    await lives().updateOne({ _id: live._id }, { $set: { highlight: found?.text ?? (clean(body.text, 4000) || null) } });
  }

  async setScreen(code: string, userId: string, body: { blank?: unknown; background?: unknown; dim?: unknown }) {
    const live = await this.owned(code, userId);
    const background = typeof body.background === 'string' ? body.background : 'none';
    if (!BACKGROUNDS.includes(background)) throw new BadRequestException('Invalid background');
    // The image never gets bright enough to compete with the text.
    const dim = Math.min(Math.max(Number(body.dim) || 60, 30), 85);
    await lives().updateOne({ _id: live._id }, { $set: { blank: body.blank === true, background, dim } });
  }
}
