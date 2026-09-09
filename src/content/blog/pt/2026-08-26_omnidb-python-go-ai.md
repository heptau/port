---
title: "O fim da era do Python? Como a IA me ajudou a reescrever em Go uma ferramenta de 10 anos"
description: "A reescrita do OmniDB de Python para Go como estudo de caso — por que na era da IA já não faz sentido sacrificar desempenho em tempo de execução no altar da comodidade de programar."
locale: "pt"
categories: ["AI", "PostgreSQL", "Software Engineering"]
date: 2026-08-26
tags: ["OmniDB", "Python", "Go", "AI", "PostgreSQL", "Rust", "reescrita de software"]
draft: false
translation_id: "2026-08-26_1"
---

Será só impressão minha, ou ultimamente compensa recorrer a uma linguagem compilada mesmo onde antes se escolheria Python automaticamente?

O OmniDB foi, em tempos, uma ferramenta GUI popular para PostgreSQL — construída sobre Python/Django, com um frontend desktop que começou no Electron e mais tarde foi trocado pelo mais leve NW.js. O projeto foi ficando parado aos poucos. Não porque a ideia fosse má, mas porque manter um stack monolítico em Python se tornou insustentável. Este artigo não é um tutorial de reescrita. É uma reflexão sobre por que projetos assim morrem — e como um stack moderno, aliado à IA, está mudando as regras do jogo.

**Tese:** Reescrever software antigo costumava ser considerado quase um suicídio («nunca reescreva do zero»). Hoje, graças às mudanças na tecnologia e à IA, uma reescrita se torna cada vez mais uma decisão racional — e não estou sozinho nessa observação, como mostram alguns exemplos conhecidos de grandes empresas.

---

## 1. O velho dogma: o tempo do desenvolvedor custa mais que a CPU

> «Hardware é barato, tempo de desenvolvedor é caro.»

Esse princípio venceu a guerra das linguagens dos últimos quinze anos. Desenvolver em Python era rápido, a sintaxe amigável, o ecossistema de bibliotecas enorme. E se a aplicação consome 150 MB de RAM e demora alguns segundos para iniciar? Sem problema — esperamos, compramos uma máquina mais potente. Praticamente todas as linguagens populares daquela era (Python, JavaScript/TypeScript, Java) são interpretadas ou rodam sobre uma máquina virtual. Quase ninguém se importava com eficiência em tempo de execução, porque «o hardware dá conta depois».

## 2. A IA muda a equação

Hoje a IA assume a escrita de código repetitivo, refatoração e até a conversão de lógica entre linguagens. O tempo gasto escrevendo código tipado e compilado já não é automaticamente várias vezes maior do que em Python — a IA consegue gerá-lo hoje em segundos.

A consequência: se o custo de desenvolvimento cai, voltam ao centro das atenções a **eficiência em tempo de execução, a velocidade de resposta e o consumo de memória** — exatamente o que, nos últimos quinze anos, foi sacrificado de bom grado em nome da comodidade de programar.

Uma pergunta para refletir: ainda faz sentido pagar com o desempenho da aplicação por «programar de forma confortável», quando boa parte desse código já é escrita por um LLM de qualquer forma?

## 3. A ilusão da comodidade, ou o inferno do deployment em Python

Python é confortável para **escrever** — mas levá-lo até o usuário é outra história:

- ambientes virtuais e conflitos de dependências,
- versões diferentes do interpretador no Linux/macOS/Windows,
- bibliotecas em C que precisam ser compiladas separadamente para cada plataforma,
- PyInstaller/cx_Freeze como «solução» — resultado: uma pasta enorme cheia de arquivos `.so`/`.dll`,
- uma configuração de CI própria para cada plataforma-alvo.

O Go resolve tudo isso de outra forma:

- **um único binário estático** — sem runtime, sem dependências,
- **compilação cruzada com um único comando** (`GOOS=linux`, `GOOS=darwin`, `GOOS=windows`) direto de uma única máquina,
- **sustentabilidade de longo prazo** — daqui a dez anos basta baixar o binário e executar. Sem dança de `pip install`, sem cadeias de dependências quebradas.

O paradoxo: desenvolver em Go acaba sendo mais simples e sustentável, porque desaparece toda a carga administrativa em torno do deployment. O que a comodidade do Python parece economizar no início volta como uma dívida a cada release.

## 4. Não estou sozinho — grandes empresas fazem reescritas parecidas

Isso não é apenas a sensação de um desenvolvedor ressuscitando um projeto paralelo de dez anos. Na mesma direção — saindo de um runtime confortável, porém mais lento, rumo a um mais rápido e previsível — seguiram nos últimos anos várias grandes empresas:

- **Discord** reescreveu seu serviço Read States (rastreamento de mensagens lidas) de Go para Rust. O motivo não foi «Go é ruim», mas um problema concreto: o coletor de lixo do Go causava picos de latência sob carga alta. O Rust, sem GC, resolveu o problema — e mesmo com apenas otimização básica superou a versão em Go ajustada manualmente ([Discord Blog](https://discord.com/blog/why-discord-is-switching-from-go-to-rust)).
- **Dropbox** reescreveu o núcleo do seu motor de sincronização (codinome interno Nucleus) de Python para Rust. O modelo de dados antigo não tinha identificadores estáveis de arquivo através de movimentações, e os limites de consumo de memória não podiam ser resolvidos com correções incrementais — era preciso um núcleo novo, determinístico e single-thread, que hoje pode ser testado massivamente por fuzzing. Segundo as próprias palavras da equipe, o Rust foi um «multiplicador de força» e uma das melhores decisões que tomaram ([Dropbox Tech](https://dropbox.tech/infrastructure/rewriting-the-heart-of-our-sync-engine)).
- **Uber** reescreveu os nós worker da sua camada de armazenamento Schemaless de Python (Flask/uWSGI, uma requisição por processo) para Go, para aproveitar a concorrência leve em vez de escalar apenas adicionando mais processos. Depois, boa parte da sua plataforma seguiu na mesma direção — Python e Node.js deixaram de dar conta dos orçamentos de latência no volume de tráfego que enfrentavam ([Uber Blog](https://www.uber.com/en-IT/blog/schemaless-rewrite/)).
- **Cloudflare** publicou, em fevereiro de 2026, como um único engenheiro, com ajuda de IA, construiu do zero em uma única semana o **vinext** — uma reimplementação completa do Next.js sobre o Vite em vez do Turbopack, com deploy direto no Cloudflare Workers. Cobre 94 % da superfície de API do Next.js 16, faz build 4,4 x mais rápido (1,67 s vs. 7,38 s) e o bundle do cliente é 57 % menor (72,9 KB vs. 168,9 KB compactado). Custo: cerca de US$ 1.100 em tokens de API ao longo de ~800 sessões do OpenCode. Nas próprias palavras da Cloudflare, «quase todas as linhas de código do vinext foram escritas pela IA» — a pessoa cuidou das decisões de arquitetura, priorização e correção de rumo quando a IA entrava em um beco sem saída ([Cloudflare Blog](https://blog.cloudflare.com/vinext/)).

O denominador comum dos três primeiros casos: nunca foi sobre modismo ou «vamos reescrever porque Go/Rust está na moda». Foi sempre sobre um limite concreto e mensurável — latência, memória, previsibilidade — que não podia ser removido na linguagem original sem uma mudança fundamental de arquitetura. A Cloudflare vai ainda mais longe e mostra a própria tese deste artigo em ação: o que antes exigiria uma equipe durante meses, uma única pessoa conseguiu em uma semana, a um custo muito abaixo do salário mensal de um único desenvolvedor.

## 5. Estudo de caso: OmniDB em números

Comparação direta entre o antigo OmniDB 3.2 (Python/Django + NW.js) e a nova versão OmniDB 4.2 (Go/Wails), medida na mesma máquina:

| Métrica | OmniDB 3.2 antigo (Python/NW.js) | OmniDB 4.2 novo (Go/Wails) | Diferença |
|---|---|---|---|
| Tamanho do `.app` | 478 MB | 73 MB | −405 MB (−85 %) |
| Arquivo de download | 201 MB | 28 MB | −173 MB (−86 %) |
| Início do servidor backend (até «listening») | 0,32 s | 0,05 s | ~6 x mais rápido |
| RSS do backend em repouso | 104 MB | 19 MB | ~5 x menos |

Uma nota honesta sobre a metodologia: não incluo um número para o início de toda a aplicação GUI (NW.js/Chromium vs. Wails/webview do sistema) — a diferença provavelmente é ainda maior, mas sem uma medição limpa eu estaria apenas chutando. Da mesma forma, não dá para comparar de forma justa a RAM da aplicação inteira: o NW.js carrega todo o seu Chromium consigo, enquanto o Wails usa o WebKit do sistema, cuja memória é contabilizada separadamente sob processos `com.apple. WebKit.*` no macOS. Por isso, o que está acima vale apenas para o servidor backend — uma afirmação menor, mas verificável.

O que se perdeu na reescrita: o sistema de plugins (plugins em Python) e o depurador passo a passo de PL/pgSQL, que precisava de uma extensão própria em C em `shared_preload_libraries` — algo que hoje nenhum Postgres gerenciado permitiria carregar de qualquer forma. Junto com eles, foram embora também três integrações de plugins para projetos upstream já mortos há muito tempo (pglogical, Postgres-BDR, Postgres-XL). Nem toda reescrita é indolor, e não vale a pena esconder isso.

## 6. Python na era da IA — desempenho real vs. desempenho aparente

O Python está vivendo um boom graças à IA/ML, mas há uma pegadinha: no treinamento e na inferência de modelos, ele funciona principalmente como «cola» (glue language) — os cálculos reais rodam por baixo em C++/CUDA/PyTorch. Já para ferramentas desktop, utilitários de linha de comando e clientes de banco de dados, o Python traz todo o peso do seu runtime — início lento, maior consumo de memória — sem que o usuário realmente se beneficie da sua flexibilidade. Ele só paga por ela.

Vale também distinguir um segundo papel em que o Python aparece cada vez mais na era da IA: como **linguagem de execução para os próprios agentes de IA**. Interpretadores de código, ambientes sandbox para processamento de arquivos ou frameworks de agentes quase sempre recorrem ao Python — ele tem uma biblioteca rica para trabalhar com dados (pandas, openpyxl, Pillow), é a linguagem sobre a qual os LLMs têm mais dados de treinamento e, sobretudo: um script que um agente gera e executa uma única vez não é distribuído a lugar nenhum. Ele vive alguns segundos dentro de um sandbox isolado e depois desaparece.

Essa é uma situação fundamentalmente diferente de uma aplicação que centenas de pessoas instalam no próprio computador e abrem todos os dias. Ninguém se importa com a velocidade de início de um script de sandbox de uso único — já a velocidade de início de uma aplicação desktop que você abre dez vezes por dia, sim. Python como «cola» para agentes e Python como runtime para uma aplicação desktop distribuída são duas tarefas diferentes com exigências diferentes, e é um erro jogá-las no mesmo saco só porque compartilham a linguagem.

## 7. Conclusão: lições para projetos futuros

1. Reescrever um projeto em uma linguagem mais eficiente já não é um capricho elitista — a IA reduziu significativamente tanto o custo da conversão quanto da manutenção contínua, e isso é feito também por grandes empresas como Discord, Dropbox, Uber ou Cloudflare, quando esbarram em um limite concreto de desempenho ou querem aproveitar as novas possibilidades do desenvolvimento assistido por IA.
2. O Python merece seu lugar onde domina — ciência de dados, prototipagem com IA, scripting agêntico pontual.
3. Para ferramentas distribuídas e aplicações cliente, porém, hoje faz sentido voltar a linguagens compiladas e autossuficientes — Go, Rust, Zig.
4. Não tenha medo de reviver boas ferramentas antigas — um stack moderno mais IA pode dar a elas uma segunda vida com um custo de manutenção mínimo.

O novo OmniDB 4.2 está disponível gratuitamente para download em 🔗 [www.omnidb.net](https://www.omnidb.net).

---

*Você tem uma experiência parecida reescrevendo uma ferramenta antiga em outra linguagem? Me conte.*
