import { toLiveSteps, type Locale, type Study } from '@preachfy/core';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { renderStudy } from './studyText';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The handout goes to the audience, so it uses the same public fields as a live class. */
export async function handoutHtml(study: Study, locale: Locale, footer: string) {
  const rendered = await renderStudy(study, locale);
  const steps = toLiveSteps(study, (_, index) => rendered.steps[index] ?? null);
  const body = steps
    .map(
      (step) => `<section><h2>${escape(step.title)}</h2>
${step.label ? `<p class="ref">${escape(step.label)}</p>` : ''}
${step.body ? `<p class="text">${escape(step.body)}</p>` : ''}
${step.question ? `<p class="question">${escape(step.question)}</p><div class="lines"></div>` : ''}</section>`,
    )
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(study.title)}</title><style>
@page { margin: 22mm 20mm; }
body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #16181D; font-size: 12pt; line-height: 1.5; }
h1, h2 { font-family: "New York", Georgia, serif; font-weight: 600; }
h1 { font-size: 26pt; line-height: 1.15; margin: 0 0 6pt; }
h2 { font-size: 15pt; margin: 0 0 4pt; }
.goal { color: #6B6F76; margin: 0 0 18pt; }
section { padding: 12pt 0; border-top: 0.5pt solid #E2E2DF; break-inside: avoid; }
.ref { font-size: 9pt; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #6B6F76; margin: 0 0 3pt; }
.text { font-family: "New York", Georgia, serif; font-size: 13pt; margin: 0; padding-left: 9pt; border-left: 3pt solid #FFD43B; }
.question { font-weight: 600; margin: 8pt 0 0; }
.lines { height: 44pt; border-bottom: 0.5pt solid #E2E2DF; }
footer { margin-top: 18pt; font-size: 9pt; color: #6B6F76; }
</style></head><body><h1>${escape(study.title)}</h1>${study.goal ? `<p class="goal">${escape(study.goal)}</p>` : ''}${body}<footer>${escape(footer)}</footer></body></html>`;
}

export async function shareHandout(study: Study, locale: Locale, footer: string) {
  const html = await handoutHtml(study, locale, footer);
  if (Platform.OS === 'web') {
    // Print the handout, not the page around it.
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.setAttribute('data-testid', 'handout');
    frame.srcdoc = html;
    frame.onload = () => frame.contentWindow?.print();
    document.body.appendChild(frame);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
