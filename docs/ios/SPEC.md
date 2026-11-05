# Preachfy para iPhone, iPad e web: especificação

Reconstruída a partir de quatro artefatos: Modo Púlpito, Modelos e Telas, Criar e Identidade.
Quando há conflito, valem as decisões de 2026-11-05 registradas aqui.

## Escopo
- iPhone, iPad e web, com visual idêntico. Mac nativo fora do escopo.
- Interface em português, inglês e espanhol. O idioma da interface é separado da versão da Bíblia.
- O Modo Púlpito é o diferencial do produto.
- Ler e marcar funcionam sem conta. Púlpito e conteúdo já baixado funcionam sem internet.
- Sincronizar entre aparelhos e web exige conta (Pro).

## Stack
- **Expo com Expo Router:** as mesmas telas geram iPhone, iPad e web. É o que garante o visual idêntico.
- **`packages/core`:** regras em TypeScript, compartilhadas e testadas.
- **`apps/api`:** conta, sincronização, aula ao vivo e telão por link.
- **Fonte da Escritura:** Newsreader embutida, porque New York só existe em aparelhos Apple e o visual precisa ser idêntico no web.
- **Build e testes:** EAS na nuvem e aparelho real. Decisão: não usar Xcode local.
- **Módulos nativos em Swift só onde preciso:** tela externa e Apple Watch.

Riscos a validar primeiro:
- **Seleção por palavra:** cada palavra é um elemento tocável. Validado no web; falta validar em aparelho e em capítulos longos, como o Salmo 119.
- **Tela externa:** a biblioteca conhecida está sem atualização há anos; pode exigir módulo próprio.
- **Gravação em segundo plano:** testar em aparelho real.
- **Assinatura:** Compra pela App Store no iOS e outro meio no web, com um único estado de Pro.

## Mudanças em relação aos artefatos
| Antes | Agora | Motivo |
|---|---|---|
| Mac incluído | Removido | Decisão do produto |
| Sem servidor e sem conta no v1 | Serviço para conta, sincronização, aula e telão por link | Cerca de 3 em cada 4 celulares no Brasil são Android; o aluno precisa entrar pelo navegador |
| Anotação ligada ao versículo | Marcação por palavra, expressão, trecho ou versículo | Requisito de marcação granular |
| Seção liga-se à anotação; editar atualiza os dois lugares | Snapshot copia as marcações para o estudo; depois disso são independentes | Isolamento de dados por estudo |
| Púlpito com ponto atual e barra lateral | Passo a passo em fluxo, com foco em um passo por vez | Distinção de um app de notas |
| SwiftData com CloudKit | Banco local no aparelho e sincronização pela API | O web precisa dos mesmos dados, e iCloud não atende o web |
| Marcar, anotar e plano de leitura grátis | Leitura, marcação simples, copiar e compartilhar são grátis | Decisão do produto |
| Telão só por AirPlay ou cabo | Três saídas: tela externa, link no navegador, sem telão | Em muitas igrejas o projetor já está ligado ao computador da mídia |

## Púlpito realista
Premissas: internet ruim, operador de mídia separado, luz baixa, interrupções.

Obrigatório no v1:
- Funciona 100% offline; o checklist Preparar confirma que o texto está baixado.
- O cronômetro usa horários absolutos, nunca contagem de ticks. Sobrevive a travamento e reabertura.
- A sessão é salva a cada mudança e pode ser retomada.
- Tela sempre ligada; o Preparar lembra de ativar Não Perturbar, que o app não consegue ligar sozinho.
- Gravação em arquivo contínuo, retomada após interrupção, com escolha de entrada (microfone do aparelho, USB-C ou mesa de som).
- Passador e pedal Bluetooth por teclado.

Telão, em ordem de utilidade:
1. **Link para a mídia:** QR code abre uma página no computador da mídia, usável como janela no projetor ou fonte de navegador no OBS e no Holyrics.
2. **Tela externa:** AirPlay ou cabo, para igrejas pequenas.
3. **Sem telão:** o pregador só lê.

Depois do v1, a validar: integração direta com a API do Holyrics; transcrição no aparelho com SpeechAnalyzer; resumo com Foundation Models (suporte a português não confirmado).

## Aula: o que o aluno recebe
O professor toca em Compartilhar e o app mostra QR code e código curto. O aluno abre um link no navegador, sem conta e sem instalar nada. Quem tem o app abre direto nele.

| Momento | O aluno recebe |
|---|---|
| Antes | Texto base, objetivo da aula e leitura prévia |
| Durante | Acompanha o ponto atual, lê o versículo, responde às perguntas e faz anotações |
| Durante, professor | Vê as respostas chegando e pode exibir uma no telão, sem nome |
| Depois | Resumo, desafio da semana e suas anotações; o link fica ativo por um prazo definido |

Regras:
- "Resposta esperada" e notas do professor nunca saem do aparelho do professor.
- O aluno entra só com um apelido, ou anônimo. Sem cadastro.
- O texto bíblico enviado respeita a licença da versão usada.
- Se a internet cair, o professor continua normalmente.
- Aluno é sempre gratuito. Compartilhar aula ao vivo é Pro.

Alternativas descartadas como base: MultipeerConnectivity (limite de 8 aparelhos, sem Android); CloudKit público (escrita exige conta Apple, leitura anônima pela web ainda não comprovada).

## Marcação, snapshot e criação

### Marcação granular
- Seleção livre: palavra, expressão, trecho ou versículo inteiro, inclusive atravessando versículos.
- Cada marcação guarda referência, versão, posição e o texto selecionado.
- Ao trocar de versão, o app procura as palavras. Se não achar, marca o versículo inteiro e avisa. A marcação nunca se perde.

### Camadas de leitura
- **Limpo:** nenhuma marcação visível.
- **Minhas marcações:** a Bíblia pessoal.
- **Estudo:** só as marcações do estudo aberto.

### Snapshot
- Transforma as seleções ativas e notas imediatas na base fixa de um estudo, aula ou sermão.
- É uma cópia: o que muda no estudo não polui a Bíblia pessoal, e vice-versa.
- Abrir o estudo reativa a camada exata daquele snapshot.

### Estrutura de um estudo
- **Texto de contexto (opcional, global):** passagem longa, versículo isolado ou texto autoral.
- **Passos:** cada um tem **texto base** (seleção bíblica ou texto de referência) e **anotações da ministração**.
- O rascunho pode ter lacunas, para os modelos continuarem funcionando. O Púlpito só abre quando todo passo tem texto base, e o app aponta quais faltam.
- Em Palestra, o texto base pode ser a frase-chave, sem Bíblia.

### Púlpito por passos
- Nunca mostra o conteúdo inteiro como um bloco contínuo. O orador avança de propósito.
- Fluxo visual com transição clara entre passos, mostrando de onde veio e para onde vai.
- Em destaque, só o texto base e as anotações daquele passo.
- O texto de contexto fica a um toque, sem tirar o foco do passo atual.

## Conta, cobrança e integração

| Peça | Papel |
|---|---|
| `apps/mobile` (Expo) | App e web, com as mesmas telas |
| `apps/api` (NestJS + MongoDB) | Login, sincronização, aula ao vivo, telão por link, webhook de assinatura |
| Better Auth, dentro da API | Conta única. Adaptador oficial para MongoDB e plugin para Expo |
| RevenueCat | Fonte única do estado Pro. Produto `pro`, para App Store e web |
| App Store (compra no app) | Cobrança no iPhone e no iPad |
| RevenueCat Billing com Stripe | Cobrança no web, só cartão |

### Venda
Como pessoa física, sem empresa, no web e na App Store. Só cartão. Pontos a resolver antes de publicar:
- Imposto sobre as vendas e a renda fica por conta da pessoa física. Sem "merchant of record", isso inclui imposto de consumo de outros países. Exige contador.
- Vender na União Europeia exige declarar status de "trader" na Apple, e endereço, telefone e e-mail ficam públicos na loja. Sem isso, o app sai da loja da UE.

### Estado
Pronto e testado no web: conta por e-mail, sessão, plano, sincronização de marcações, webhook do RevenueCat e exclusão de conta.

Falta, antes de publicar:
- Compra no app e paywall (`react-native-purchases`). Depende das chaves do RevenueCat.
- Sign in with Apple e Google. O código liga sozinho com as credenciais, mas falta o botão e o teste real.
- Revogar o token da Apple ao excluir a conta.
- Recuperar senha e confirmar e-mail. Depende de um serviço de envio de e-mail.
- Proteger as rotas antigas da API, que continuam abertas.
- Implantar a API. A versão do Node precisa ser 22.12 ou maior, porque o `better-auth` é um pacote ESM.

### Regras
- O `id` do usuário no Better Auth é o `appUserID` no RevenueCat. Sem isso, a assinatura feita em um lugar não aparece no outro.
- Ler, marcar, copiar e compartilhar não exigem conta. A conta é pedida na hora de assinar ou sincronizar.
- O app nunca aponta para a compra no web na v1. Quem assinou no web entra na conta e o Pro é liberado. Link externo tem comissão e regras por país; revisar depois.
- O webhook do RevenueCat grava a validade do Pro na API. A API confere isso em sincronização, aula ao vivo e telão. O app usa o SDK só para a tela.
- Cancelar a assinatura nunca apaga dados.

### Login
- Sign in with Apple, Google e e-mail. Oferecer Google no iOS exige uma opção equivalente, e Sign in with Apple cumpre isso.
- Excluir a conta dentro do app é obrigatório, incluindo revogar o token da Apple no servidor. O aviso precisa dizer que a assinatura da App Store é cancelada à parte.
- Sessão em armazenamento seguro no aparelho e em cookie no web. API e web no mesmo domínio-pai.

### Sincronização
- O app continua funcionando offline: grava local e envia depois.
- Conflito: vale a alteração mais recente, por item. Exclusão é marcada, não apagada na hora.
- Ao criar conta, o que já existe no aparelho sobe para a conta.

### Privacidade
Sermões, anotações e respostas de alunos podem revelar convicção religiosa, que é dado sensível na LGPD e no GDPR. Exige política de privacidade, base legal, exportação e exclusão antes de publicar. Vale revisão jurídica.

### Infraestrutura
O plano gratuito do Render hiberna e não serve para login nem aula ao vivo. O web fica em hospedagem estática; a API, em plano pago.

## Strong (hebraico e grego)
Decidido: entra depois de Criar e Púlpito, como recurso Pro e pacote opcional.

- **Dados:** STEPBible-Data (TAHOT, TAGNT, TBESH, TBESG). CC BY 4.0: exige crédito com link para STEPBible.org e publicar o registro das alterações.
- **Como funciona:** painel "Original" por versículo: palavras em hebraico ou grego, Strong, morfologia e definição, em qualquer versão, porque a ligação é por referência.
- **Limite:** Bíblia Livre, Almeida e Reina-Valera não têm cada palavra ligada ao Strong. Não dá para tocar em "pastor" e cair direto no número. Só a KJV tem esse alinhamento, com licença ainda a confirmar.
- **Idiomas:** as definições são em inglês. Não achei versão aberta em português ou espanhol confirmada. Traduzir cerca de 14 mil verbetes exige revisão teológica.
- **Numeração:** versículos em hebraico podem não bater com as traduções, sobretudo nos Salmos. Exige tabela de correspondência.
- **Tamanho:** baixar como pacote opcional, para não pesar no app.

## Serviço de compartilhamento
Reaproveita `apps/api` e `apps/web`. Guarda só o que o professor publicou e expira. O plano gratuito do Render hiberna, então a aula ao vivo exige um plano sempre ligado.

## Grátis e Pro
Regra: leitura, marcação simples, copiar e compartilhar versículos são grátis. Criar conteúdo para o Púlpito é Pro. A lista oficial está em `packages/core/src/entitlements.ts`.

- **Grátis:** ler, trocar de versão, buscar, Modo Limpo e destacar com as 8 categorias, inclusive por palavra, copiar e compartilhar versículos.
- **Pro:** todo o resto, incluindo notas por versículo, categorias próprias, comparar versões, plano de leitura, sincronização, snapshot, criar, Púlpito, telão, gravação, aula ao vivo e PDF.
- **Sempre disponível:** ver e exportar o que a pessoa já criou, mesmo sem assinatura.
- **Aluno:** acessa a aula de graça; quem paga é o professor.

## Traduções da v1
Geradas por `tools/bible/build.mjs`, que falha se surgir divergência de estrutura. Padrão do app: Bíblia Livre.

| Versão | Origem | Licença | Observação |
|---|---|---|---|
| Bíblia Livre | eBible.org (porbr2018) | CC BY; 3.0 Brasil no repositório oficial, 4.0 no eBible | Crédito obrigatório, na tela Sobre |
| Almeida 1911 | Transcrição de domínio público (eBook 62383) | Domínio público nos EUA | Grafia de 1911; sem notas nem títulos dos salmos; 5 capítulos com numeração própria |
| Reina-Valera 1909 | eBible.org (spaRV1909) | Domínio público | Numeração espanhola em 12 capítulos; texto completo |
| KJV | eBible.org (eng-kjv2006) | Domínio público fora do Reino Unido | Restrição é de impressão no Reino Unido |

NVI, ACF e ARA ficam para quando houver licença. Antes de publicar, vale uma revisão jurídica do uso comercial, sobretudo da Almeida 1911 no Brasil e em Portugal.

## Dados locais
Marcações e posição de leitura ficam em armazenamento chave-valor, igual no aparelho e no web. O SQLite no web exige cabeçalhos especiais no servidor e não tem busca textual. A troca por banco fica para quando houver sincronização.

## Decisões em aberto
- País de residência fiscal de quem vende.
- Preços mensal e anual.
- Ícone (recomendado: B, a fita) e tema padrão.
- Plano de leitura e folheto em PDF: v1 ou v1.x.

## Referência
Telas, modelos, dados e marca seguem os artefatos:
- https://claude.ai/artifact/CMMdamrQgdpbc4EUf91o1J
- https://claude.ai/artifact/Nr1ufXunSqutEiga8oFWrD
- https://claude.ai/artifact/FNFGGqBW2ZQvooH8snV9PP
- https://claude.ai/artifact/D6nDD5cwy4vHV5ik9cRJht
