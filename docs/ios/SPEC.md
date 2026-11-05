# Preachfy para iPhone, iPad e web: especificação

Reconstruída a partir de quatro artefatos: Modo Púlpito, Modelos e Telas, Criar e Identidade.
Quando há conflito, valem as decisões de 2026-11-05 registradas aqui.

## Escopo
- iPhone, iPad e web, com visual idêntico. Mac nativo fora do escopo.
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

## Serviço de compartilhamento
Reaproveita `apps/api` e `apps/web`. Guarda só o que o professor publicou e expira. O plano gratuito do Render hiberna, então a aula ao vivo exige um plano sempre ligado.

## Grátis e Pro
Regra: leitura, marcação simples, copiar e compartilhar versículos são grátis. Criar conteúdo para o Púlpito é Pro. A lista oficial está em `packages/core/src/entitlements.ts`.

- **Grátis:** ler, trocar de versão, buscar, Modo Limpo e destacar com as 8 categorias, inclusive por palavra, copiar e compartilhar versículos.
- **Pro:** todo o resto, incluindo notas, categorias próprias, comparar versões, plano de leitura, sincronização, snapshot, criar, Púlpito, telão, gravação, aula ao vivo e PDF.
- **Sempre disponível:** ver e exportar o que a pessoa já criou, mesmo sem assinatura.
- **Aluno:** acessa a aula de graça; quem paga é o professor.

## Traduções da v1
Almeida 1911, Bíblia Livre e KJV. Confirmar a licença de cada uma na fonte antes de publicar. NVI, ACF e ARA ficam para quando houver licença.

## Decisões em aberto
- Preços mensal e anual.
- Ícone (recomendado: B, a fita) e tema padrão.
- Plano de leitura e folheto em PDF: v1 ou v1.x.

## Referência
Telas, modelos, dados e marca seguem os artefatos:
- https://claude.ai/artifact/CMMdamrQgdpbc4EUf91o1J
- https://claude.ai/artifact/Nr1ufXunSqutEiga8oFWrD
- https://claude.ai/artifact/FNFGGqBW2ZQvooH8snV9PP
- https://claude.ai/artifact/D6nDD5cwy4vHV5ik9cRJht
