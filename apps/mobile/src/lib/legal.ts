import type { Locale } from '@preachfy/core';

type Doc = Record<Locale, [string, string][]>;

// Filled before publishing, with the seller's legal name, tax address and contact.
const SELLER = '[NOME LEGAL], [MORADA FISCAL], Portugal';
const CONTACT = '[E-MAIL DE CONTACTO]';

export const legal: { privacy: Doc; terms: Doc } = {
  privacy: {
    pt: [
      ['Quem trata os dados', `${SELLER}. Contato: ${CONTACT}.`],
      ['O que guardamos', 'Conta: nome, e-mail e senha cifrada. Conteúdo: marcações, estudos, anotações e registros de pregação, quando você sincroniza. Comunidades: o que você publica e seu nome para os membros. Assinatura: estado do plano, sem dados de cartão.'],
      ['Dado sensível', 'Sermões, anotações e respostas podem revelar convicção religiosa. Tratamos esse conteúdo com base no seu consentimento explícito, ao criar a conta e sincronizar, e você pode retirá-lo excluindo a conta.'],
      ['Sem conta', 'Ler e marcar funcionam sem conta, e tudo fica no aparelho. O aluno de uma aula não cria conta: guardamos só a resposta e o apelido, se informados, até a aula expirar. Suas anotações de aluno ficam no seu aparelho. Gravações de pregação ficam só no aparelho que gravou.'],
      ['Quem recebe', 'Hospedagem da API e do banco de dados; RevenueCat, para o estado da assinatura; Apple e Stripe, para a cobrança; Brevo, para enviar os e-mails da conta. Não vendemos dados nem usamos publicidade.'],
      ['Prazos', 'Dados da conta ficam até a exclusão. Aulas ao vivo expiram em até 30 dias e são apagadas com as respostas. Registros fiscais seguem o prazo legal.'],
      ['Seus direitos', 'Acesso, correção, exportação, oposição e exclusão, nos termos do RGPD e da LGPD. Exporte em Ajustes e exclua a conta em Conta. Você pode reclamar à CNPD, em Portugal, ou à ANPD, no Brasil.'],
    ],
    en: [
      ['Who handles your data', `${SELLER}. Contact: ${CONTACT}.`],
      ['What we keep', 'Account: name, email and an encrypted password. Content: highlights, studies, notes and delivery records, when you sync. Communities: what you post and your name for members. Subscription: plan status, with no card details.'],
      ['Sensitive data', 'Sermons, notes and answers may reveal religious belief. We process this content on your explicit consent, given when you create an account and sync, and you can withdraw it by deleting the account.'],
      ['Without an account', 'Reading and highlighting work with no account, and everything stays on the device. Class students create no account: we keep only the answer and nickname, if given, until the class expires. Student notes stay on your device. Sermon recordings stay only on the device that made them.'],
      ['Who receives it', 'Hosting of the API and database; RevenueCat, for subscription status; Apple and Stripe, for billing; Brevo, to send account emails. We do not sell data or use advertising.'],
      ['How long', 'Account data stays until deletion. Live classes expire within 30 days and are erased with their answers. Tax records follow the legal period.'],
      ['Your rights', 'Access, correction, export, objection and deletion, under the GDPR and LGPD. Export in Settings and delete the account in Account. You may complain to the CNPD in Portugal or your local authority.'],
    ],
    es: [
      ['Quién trata los datos', `${SELLER}. Contacto: ${CONTACT}.`],
      ['Qué guardamos', 'Cuenta: nombre, correo y contraseña cifrada. Contenido: resaltados, estudios, notas y registros de predicación, cuando sincronizas. Comunidades: lo que publicas y tu nombre para los miembros. Suscripción: estado del plan, sin datos de tarjeta.'],
      ['Datos sensibles', 'Sermones, notas y respuestas pueden revelar convicciones religiosas. Tratamos este contenido con tu consentimiento explícito, al crear la cuenta y sincronizar, y puedes retirarlo eliminando la cuenta.'],
      ['Sin cuenta', 'Leer y resaltar funcionan sin cuenta, y todo queda en el dispositivo. El alumno de una clase no crea cuenta: guardamos solo la respuesta y el apodo, si los da, hasta que la clase expire. Tus notas de alumno quedan en tu dispositivo. Las grabaciones de predicación quedan solo en el dispositivo que las hizo.'],
      ['Quién los recibe', 'Alojamiento de la API y la base de datos; RevenueCat, para el estado de la suscripción; Apple y Stripe, para el cobro; Brevo, para enviar los correos de la cuenta. No vendemos datos ni usamos publicidad.'],
      ['Plazos', 'Los datos de la cuenta se conservan hasta su eliminación. Las clases en vivo expiran en un máximo de 30 días y se borran con sus respuestas. Los registros fiscales siguen el plazo legal.'],
      ['Tus derechos', 'Acceso, rectificación, exportación, oposición y supresión, según el RGPD. Exporta en Ajustes y elimina la cuenta en Cuenta. Puedes reclamar ante la CNPD en Portugal o tu autoridad local.'],
    ],
  },
  terms: {
    pt: [
      ['Serviço', `O Preachfy é fornecido por ${SELLER}. Ler e marcar são gratuitos; o Pro é uma assinatura.`],
      ['Assinatura', 'Renova automaticamente até ser cancelada. Na App Store, cancele nos ajustes da Apple. Ao terminar, o que você criou continua visível e exportável.'],
      ['Conteúdo da comunidade', 'Não há tolerância para conteúdo ofensivo, abusivo ou ilegal, nem para assédio. Qualquer membro pode denunciar publicações e bloquear pessoas. Líderes removem o que viola estas regras, e contas reincidentes são encerradas.'],
      ['Seu conteúdo', 'O que você cria é seu. Você nos autoriza apenas a guardar e entregar esse conteúdo para fazer o serviço funcionar.'],
      ['Versões da Bíblia', 'Cada versão segue sua licença, indicada em Sobre.'],
    ],
    en: [
      ['Service', `Preachfy is provided by ${SELLER}. Reading and highlighting are free; Pro is a subscription.`],
      ['Subscription', 'It renews automatically until canceled. On the App Store, cancel in Apple settings. When it ends, what you made stays visible and exportable.'],
      ['Community content', 'There is no tolerance for offensive, abusive or illegal content, or for harassment. Any member can report posts and block people. Leaders remove what breaks these rules, and repeat offenders lose their accounts.'],
      ['Your content', 'What you create is yours. You only allow us to store and deliver it so that the service works.'],
      ['Bible versions', 'Each version follows its license, shown in About.'],
    ],
    es: [
      ['Servicio', `Preachfy es ofrecido por ${SELLER}. Leer y resaltar son gratis; Pro es una suscripción.`],
      ['Suscripción', 'Se renueva automáticamente hasta que se cancele. En App Store, cancela en los ajustes de Apple. Al terminar, lo que creaste sigue visible y exportable.'],
      ['Contenido de la comunidad', 'No se tolera contenido ofensivo, abusivo o ilegal, ni el acoso. Cualquier miembro puede denunciar publicaciones y bloquear personas. Los líderes retiran lo que viola estas reglas, y las cuentas reincidentes se cierran.'],
      ['Tu contenido', 'Lo que creas es tuyo. Solo nos autorizas a guardarlo y entregarlo para que el servicio funcione.'],
      ['Versiones de la Biblia', 'Cada versión sigue su licencia, indicada en Acerca de.'],
    ],
  },
};
