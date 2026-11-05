import { bookName, passageText } from '@preachfy/core';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type Component, type ComponentRef, type RefObject } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Field, Hint, Pill, Screen, ui } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { resolvePassage } from '@/lib/passage';
import { useReader } from '@/lib/store';
import { renderText, type Rendered } from '@/lib/studyText';
import { paper, serif } from '@/lib/theme';

const backgrounds = { dawn: '#8A4A32', night: '#232247', field: '#37573F', wine: '#722F27' } as const;
const shapes = { square: 1, story: 9 / 16, wide: 16 / 9 } as const;
const MAX_VERSES = 3;

export default function VerseCard() {
  const { t, locale } = useT();
  const params = useLocalSearchParams<{ reference?: string }>();
  const { translation, book, chapter } = useReader();
  const [reference, setReference] = useState(params.reference ?? `${bookName(book, locale)} ${chapter}:1`);
  const [text, setText] = useState<Rendered | null>(null);
  const [background, setBackground] = useState<keyof typeof backgrounds>('wine');
  const [shape, setShape] = useState<keyof typeof shapes>('square');
  const [signature, setSignature] = useState('');
  const [failed, setFailed] = useState(false);
  const card = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    let live = true;
    resolvePassage(reference, locale, translation).then(async (found) => {
      if (!live) return;
      const short = found ? { ...found, to: Math.min(found.to, found.from + MAX_VERSES - 1) } : null;
      const rendered = short ? await renderText(passageText(short), locale) : null;
      if (live) setText(rendered);
    });
    return () => {
      live = false;
    };
  }, [reference, locale, translation]);

  const share = async () => {
    setFailed(false);
    try {
      if (Platform.OS === 'web') {
        const uri = await captureRef(card as unknown as RefObject<Component>, { format: 'png', result: 'data-uri' });
        const blob = await (await fetch(uri)).blob();
        const file = new File([blob], 'preachfy.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
        else {
          const link = document.createElement('a');
          link.href = uri;
          link.download = 'preachfy.png';
          link.click();
        }
      } else {
        const url = await captureRef(card as unknown as RefObject<Component>, { format: 'png' });
        await Share.share({ url });
      }
    } catch {
      setFailed(true);
    }
  };

  return (
    <Screen title={t('verseCard')} close testID="card">
      <Field testID="card-reference" value={reference} onChangeText={setReference} placeholder={t('passageHint')} autoCorrect={false} />
      <View style={ui.row}>
        {(Object.keys(shapes) as (keyof typeof shapes)[]).map((key) => (
          <Pill key={key} testID={`shape-${key}`} primary={shape === key} label={t(key === 'square' ? 'shapeSquare' : key === 'story' ? 'shapeStory' : 'shapeWide')} onPress={() => setShape(key)} />
        ))}
      </View>
      <View style={ui.row}>
        {(Object.keys(backgrounds) as (keyof typeof backgrounds)[]).map((key) => (
          <Pressable
            key={key}
            testID={`bg-${key}`}
            accessibilityRole="button"
            accessibilityState={{ selected: background === key }}
            style={[s.swatch, { backgroundColor: backgrounds[key] }, background === key && s.swatchOn]}
            onPress={() => setBackground(key)}
          />
        ))}
      </View>
      <Field testID="card-signature" value={signature} onChangeText={setSignature} placeholder={t('signature')} />
      <View ref={card} collapsable={false} testID="card-preview" style={[s.card, { backgroundColor: backgrounds[background], aspectRatio: shapes[shape] }, shape === 'story' && s.story]}>
        <Text style={s.reference}>{text?.label}</Text>
        <Text style={s.text}>{text?.body}</Text>
        <Text style={s.brand}>{signature ? `${signature} · ` : ''}Preachfy</Text>
      </View>
      <Pill testID="card-share" primary disabled={!text} label={t('share')} onPress={share} />
      {failed ? <Hint testID="card-failed">{t('imageFailed')}</Hint> : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  swatch: { width: 44, height: 44, borderRadius: 22 },
  swatchOn: { borderWidth: 3, borderColor: paper.mark },
  card: { width: '100%', maxWidth: 420, alignSelf: 'center', justifyContent: 'center', gap: 14, padding: 28, borderRadius: 16 },
  story: { maxWidth: 280 },
  reference: { fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#FFFFFF' },
  text: { fontFamily: serif, fontSize: 22, lineHeight: 30, color: '#FFFFFF' },
  brand: { fontSize: 12, color: '#FFFFFF', opacity: 0.85 },
});
