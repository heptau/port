---
title: "Aplicações em sandbox: quando o isolamento corta a base de dados do .pgpass"
description: "Como levei o OmniDB para o sandbox do macOS e esbarrei num ficheiro .pgpass inacessível — e como deve ser uma concessão de permissões a pedido segura no macOS, Linux e Windows."
locale: "pt"
categories: ["PostgreSQL", "Software Engineering"]
date: 2026-09-09
tags: ["sandbox", "macOS", "Linux", "Windows", "segurança", "PostgreSQL", "OmniDB", "Flatpak", "MSIX"]
draft: false
translation_id: "2026-09-09_1"
---

Como programadores queremos fazer aplicações seguras. Um dos melhores passos para proteger o utilizador é fechar a aplicação num sandbox (um ambiente isolado). O sandbox garante que, mesmo que se encontre uma vulnerabilidade na aplicação, um atacante não possa percorrer livremente o disco do utilizador nem ler dados sensíveis de outros programas.

Mas a segurança tem o seu preço, na forma de obstáculos tanto para o programador como para o utilizador. Recentemente levei o OmniDB para o sandbox no macOS e depressa esbarrei num problema clássico: de repente, a aplicação já não conseguia carregar as palavras-passe das minhas bases de dados PostgreSQL.

---

## 1. Uma história da prática: onde está o meu `.pgpass` e porque é que faz sentido estar escondido?

O PostgreSQL usa habitualmente o ficheiro `~/.pgpass` guardado na pasta pessoal do utilizador. Esse ficheiro contém credenciais em texto simples: anfitriões, portos, bases de dados, utilizadores e palavras-passe.

Assim que fechei o [OmniDB](https://www.omnidb.net) no sandbox do macOS, o sistema cortou estritamente o acesso da aplicação à pasta pessoal. O OmniDB não conseguia ligar-se à base de dados, porque simplesmente não via o `.pgpass`.

## 2. Porque é que o acesso «apenas a pedido» é afinal uma vitória para a segurança?

À primeira vista era uma complicação, mas visto em retrospetiva trata-se de uma excelente medida de segurança. O ficheiro `.pgpass` contém muitas vezes dezenas de palavras-passe de bases de dados de produção e de desenvolvimento. Quer mesmo que qualquer aplicação descarregada tenha acesso automático a semelhante tesouro? De todo. Se uma aplicação não verificada obtivesse acesso completo a esse ficheiro, poderia enviar todas as suas palavras-passe para fora sem que soubesse.

## 3. Como resolvi isto no macOS?

Em vez de pedir uma permissão ampla ao disco inteiro (o que anula o sentido do sandbox), escolhi uma solução conduzida pelo utilizador e pelo princípio do menor privilégio:

1. Se o OmniDB tentar ligar-se a uma base de dados e falhar por falta de permissões sobre o `.pgpass`, a interface mostra uma mensagem de erro clara.
2. Dessa mensagem faz parte um botão para conceder permissões.
3. Ao clicar, abre-se um diálogo do sistema (`NSOpenPanel`), onde o utilizador escolhe manualmente o ficheiro `.pgpass` (ou confirma o acesso a ele).
4. O macOS entrega à aplicação um chamado Security Scoped Bookmark — uma exceção graças à qual a aplicação obtém acesso permanente e legítimo a esse ficheiro concreto.

O utilizador sabe o que está a disponibilizar à aplicação e porquê, enquanto o resto do disco e os restantes ficheiros permanecem hermeticamente protegidos.

## 4. O sandbox do macOS na perspetiva do UX e do programador: ótima ideia, lógica estranha

O que é ótimo no sandbox do macOS é que pode fazer parte de qualquer aplicação, independentemente de como chegou ao computador: da App Store, do GitHub ou como pacote `.dmg` do site do programador. Ao trabalhar com ele, porém, várias incoerências saltaram-me à vista:

### 4.1 Só descobre o sandbox quando já pode ser tarde

Como utilizador atento à segurança, antes de executar uma aplicação desconhecida gostaria de saber se ela vai correr num sandbox isolado ou se tem acesso total ao meu sistema.

Onde esperaria encontrar essa informação? Logicamente, na janela de informações do ficheiro (Cmd + I no Finder). Só que aí não encontra uma única menção ao sandbox. A interface gráfica do macOS oferece um único sítio onde o descobrir: o Monitor de Atividade (Activity Monitor), onde é preciso ativar a coluna Sandbox e olhar para um processo já em execução. O que é absurdo: no momento em que o vê no Monitor de Atividade, a aplicação perigosa já está a correr e pode já ter causado estragos.

Verificar isso à partida só é possível pela linha de comandos:

```bash
codesign -d --entitlements - /Applications/OmniDB.app
```

Na saída procura-se `com.apple.security.app-sandbox`. Funciona, mas um utilizador comum — precisamente aquele que o sandbox deveria proteger — não vai abrir o Terminal.

### 4.2 A Apple devia ser mais tolerante com as aplicações em sandbox

Hoje a Apple bloqueia com muito rigor a execução de aplicações de origem desconhecida (Gatekeeper, a necessidade de uma conta de programador cara, a notarização). Mas se o próprio programador decidir voluntariamente fechar a sua aplicação num sandbox estrito e atar as próprias mãos, o sistema devia ser mais tolerante ao descarregá-la de sítios desconhecidos. Se uma aplicação a correr em isolamento não tem acesso nem aos ficheiros nem ao sistema, o risco para o utilizador cai drasticamente.

### 4.3 Obstáculos desnecessários na assinatura ad-hoc

Se o programador assinar a aplicação apenas localmente/ad-hoc (`codesign -s -`), o macOS não lhe permite definir certos entitlements de sandbox. O programador é forçado a criar o seu próprio certificado autoassinado só para poder testar localmente o sandbox com permissões. Na prática, isso não traz absolutamente nenhuma segurança real adicional — é apenas um passo burocrático inútil durante o desenvolvimento.

## 5. Como transpor o mesmo conceito para Linux e Windows?

Para já tenho este sistema de concessão de permissões a pedido plenamente funcional no macOS. Mas o OmniDB é uma ferramenta multiplataforma, por isso estou agora a resolver como transpor exatamente o mesmo conceito (botão na aplicação → diálogo do sistema → concessão da exceção) para os restantes sistemas.

- **Linux (Flatpak e XDG Portals):** Para Linux planeio usar o Flatpak. Para comunicar com o sistema fora do sandbox, ele usa os chamados XDG Desktop Portals. Arquitetonicamente, os portais funcionam de forma muito semelhante ao macOS: quando a aplicação pede a seleção de um ficheiro através do portal, o diálogo é desenhado pelo próprio sistema, não pela aplicação. Assim que o utilizador escolhe o `.pgpass` no diálogo, o portal entrega à aplicação a permissão para ler esse ficheiro concreto.
- **Windows (MSIX e AppContainer):** No Windows o objetivo é empacotar em MSIX, com a aplicação a correr num ambiente AppContainer. Aqui aproveita-se a interface de sistema `FileOpenPicker`. Se o utilizador selecionar um ficheiro através desse diálogo nativo do Windows, o AppContainer concede à aplicação um token de acesso a esse ficheiro.

O princípio mantém-se assim idêntico em todas as plataformas: por omissão a aplicação não vê nada, mas o utilizador pode, com um único clique na janela de erro, disponibilizar-lhe em segurança exatamente o único ficheiro de que precisa.

## 6. Panorama das opções de sandboxing: como é isto nos vários sistemas em geral?

Além do que planeio usar para o OmniDB, em cada plataforma existe toda uma série de outras abordagens. Dividem-se em soluções nativas do sistema e em ferramentas de terceiros ou contentores.

### 6.1 macOS

- **Solução nativa:** Apple App Sandbox (através de entitlements, diretamente no sistema).
- **Alternativas:** Execução em Docker ou numa máquina virtual leve (por exemplo através de Virtualization.framework, UTM, Parallels).

### 6.2 Linux

- **Soluções nativas e de empacotamento:**
  - **Flatpak:** Usa por baixo o `bubblewrap` (namespaces, seccomp). O padrão para aplicações GUI isoladas.
  - **Snap:** A solução da Canonical, assente em perfis AppArmor.
- **Alternativas para pacotes comuns (DEB, RPM, AppImage):**
  - **Firejail:** Excelente ferramenta com a qual o próprio utilizador pode «embrulhar» qualquer aplicação existente e impedi-la de ler, por exemplo, `~/.ssh` ou `~/.pgpass`.
  - **systemd/cgroups/bubblewrap:** Scripts próprios para isolar processos ao nível do sistema.
  - **Docker/Podman:** Ótimos para CLI e servidores, mas com aplicações GUI esbarram na complicada passagem de sockets X11/Wayland.

### 6.3 Windows

- **Solução nativa:**
  - **MSIX (AppContainer):** O contentor isolado oficial da Microsoft, com registo e sistema de ficheiros virtuais.
- **Alternativas:**
  - **Sandboxie-Plus:** Popular ferramenta de código aberto. Permite executar qualquer `.exe` clássico numa «caixa de areia» isolada sem alterar a aplicação.
  - **Windows Sandbox:** Ambiente virtual rápido e descartável assente em Hyper-V. Adequado para testar um ficheiro suspeito descarregado da internet (ao fechar, tudo é apagado).

## 7. Porque é que a solução nativa do sistema é sempre a melhor escolha?

Mesmo que no Linux ou no Windows existam várias ferramentas de terceiros (Firejail, Sandboxie) ou contentores (Docker), para o programador de uma aplicação de secretária é sempre melhor escolher a solução nativa do sistema (App Sandbox, Flatpak, MSIX).

As razões são simples:

1. **Conforto do utilizador (UX):** O sandbox nativo sabe mostrar ao utilizador um diálogo do sistema no momento exato em que a aplicação precisa de um ficheiro. O utilizador nem sequer nota que a aplicação corre isolada.
2. **Desempenho:** O isolamento nativo aproveita diretamente o núcleo do sistema operativo (namespaces, AppArmor, AppContainer). Por baixo não corre nenhuma virtualização pesada.
3. **Sustentabilidade:** Confia num padrão mantido pelo criador do sistema operativo (Apple, Microsoft, a comunidade do Flatpak) e não em ferramentas de terceiros que podem deixar de funcionar com a próxima atualização do sistema.

## 8. Conclusão: a segurança tem de fazer sentido para o utilizador e para o programador

O caso do OmniDB e do ficheiro `.pgpass` mostra duas coisas:

1. **A segurança a pedido funciona:** Negar à aplicação o acesso automático a ficheiros sensíveis com palavras-passe e exigi-lo apenas através de uma ação explícita do utilizador na interface é o caminho certo para proteger a privacidade.
2. **Os sistemas têm lacunas no UX do sandbox:** É pena que o macOS não deixe claro ao utilizador (por exemplo em `Cmd+I`) que está a executar uma aplicação em isolamento seguro, e que coloque aos programadores obstáculos desnecessários, como precisar de certificados autoassinados apenas para testes locais.

O sandbox não devia ser uma «caixa negra» para o utilizador nem um «mal necessário» para o programador, mas um padrão transparente de que ambas as partes beneficiam.

---

*Está a lidar com um problema semelhante de sandbox na sua aplicação? Escreva-me como o resolveu.*
