---
title: "Arquitetura sem boilerplate: Quando o banco de dados vira gateway de API e a IA vira interface"
description: "Como eliminar toda a camada de backend com PgArachne e MCP, distribuir o sistema a partir de um único binário e deixar agentes de IA funcionarem como interface do usuário."
locale: "pt"
categories: ["AI", "PostgreSQL"]
date: 2026-06-23
tags: ["PostgreSQL", "PgArachne", "MCP", "AI", "arquitetura"]
draft: false
translation_id: "2026-06-23_1"
---

Na engenharia de software existe uma tendência de longa data para empilhar abstrações. Quando construímos uma aplicação web comum hoje, o stack tecnológico típico envolve um banco de dados relacional, uma camada ORM (Object-Relational Mapping), um framework de backend (Node.js, Python, Go, .NET), bibliotecas de validação, serializadores para JSON e, apenas no final, um servidor HTTP que expõe esses dados para a rede.

No fim das contas, desenvolvedores de backend gastam uma quantidade enorme de tempo escrevendo o chamado código «boilerplate» — traduzindo mecanicamente estruturas do banco de dados em rotas HTTP e validando o que muitas vezes já é validado no nível do banco de dados.

Se, porém, a lógica de negócio da aplicação está intimamente ligada ao modelo de dados e à integridade dos dados, surge uma pergunta legítima: *Realmente precisamos de uma aplicação backend separada apenas como aquecedor de passagem para JSON?*

A abordagem «banco de dados como backend» (Database-as-a-Backend) não é conceitualmente nova. No entanto, combinada com a ferramenta [PgArachne](https://www.pgarachne.com) e o novo padrão Model Context Protocol (MCP), ela ganha uma dimensão arquitetural completamente nova. Este texto detalha como, com esse stack, é possível eliminar toda uma camada de aplicações, distribuir um sistema completo a partir de um único binário e permitir que agentes de IA funcionem como a própria interface do usuário.

---

## 1. A mudança arquitetural: De controllers à lógica pura no banco de dados

Uma API REST tradicional exige, para cada entidade, a definição de uma rota, um controller, um middleware de validação, tratamento de erros e um mapeamento para uma query SQL. Se a estrutura de uma tabela ou uma regra de negócio mudar, o desenvolvedor precisa ajustar o código em vários lugares no backend e, em seguida, também no frontend.

O PgArachne elimina completamente essa camada intermediária. O desenvolvimento de backend aqui se resume à definição do schema do banco de dados e de funções PL/pgSQL (ou PL/v8 ou PL/Python). A ferramenta funciona como um gateway de API fino e de alto desempenho, escrito em Go, que roda diretamente na frente do PostgreSQL e automaticamente mapeia stored procedures e funções para uma **API JSON-RPC 2.0**.

### Como a reflexão funciona na prática

Assim que existe no banco de dados uma função que aceita e retorna o tipo `jsonb`, o PgArachne a registra imediatamente e a expõe para o mundo por meio de reflexão nos catálogos de sistema do PostgreSQL (`pg_proc`, `pg_namespace`, `pg_argument`). Sem reinicializações de servidor, sem compilações.

Considere uma função simples para cadastro de usuário:

```sql
CREATE OR REPLACE FUNCTION api.register_user(params jsonb)
RETURNS jsonb AS $$
DECLARE
   new_user_id uuid;
   user_email text;
BEGIN
   user_email := lower(trim(params->>'email'));

  -- Validace přímo v databázi
   IF user_email !~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'
   THEN
      RAISE EXCEPTION 'Invalid email address' USING ERRCODE = '22000';
   END IF;

   INSERT INTO users (email, password_hash)
   VALUES (user_email, crypt(params->>'password', gen_salt('bf')))
   RETURNING id INTO new_user_id;

   RETURN jsonb_build_object(
      'status', 'success',
      'user_id', new_user_id
   );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION api.register_user(jsonb) IS 'Registers a new user and returns the user ID. Expects email and password fields.';
```

O PgArachne mapeia essa função automaticamente para um endpoint JSON-RPC. A aplicação cliente (ou um agente de IA) então envia uma requisição POST padrão com o corpo:

```json
{
   "jsonrpc": "2.0",
   "method": "api.register_user",
   "params": {
      "email": "user@port80.cz",
      "password": "SuperSecretPassword123"
   },
   "id": 1
}
```

### Abordagem híbrida: Do CRUD universal à lógica estrita

Esse modelo frequentemente esbarra em preocupações com excesso de rigidez. E se no início do projeto eu não quiser escrever uma função SQL para cada tabela? E se mais tarde eu precisar de validações extremamente complexas? O PgArachne suporta uma estratégia híbrida:

1. **Funções universais (MVP rápido):** No início do projeto, é possível habilitar funções CRUD genéricas que permitem à aplicação cliente consultar, filtrar e modificar tabelas diretamente (de forma semelhante ao PostgREST). O desenvolvimento do frontend pode começar imediatamente.
2. **Funções RPC dedicadas (Hardening de produção):** À medida que o projeto cresce e exige processos de negócio mais estritos (por exemplo, processamento transacional de pedidos vinculado ao estado do estoque), o acesso universal para aquela entidade é fechado e substituído por uma função SQL isolada. Para a aplicação cliente, nada muda externamente — ela continua se comunicando via protocolo JSON-RPC.

---

## 2. O modelo de segurança: Troca de identidade via `SET LOCAL ROLE`

Uma das objeções mais frequentes à arquitetura «banco de dados como backend» é a questão de segurança. Se a aplicação cliente se comunica diretamente com o gateway do banco de dados, como impedir que o usuário A leia os dados do usuário B?

O PgArachne não gerencia autorização nem direitos de acesso por conta própria. Em vez disso, ele delega a segurança cem por cento ao núcleo comprovado do PostgreSQL e ao mecanismo de **Row-Level Security (RLS)**.

### Como funciona no banco de dados:

1. **Autenticação (BYO-JWT):** O PgArachne suporta o modelo *Bring Your Own JWT*. É possível usar qualquer provedor de identidade externo (Auth0, Clerk, Supabase Auth ou um microsserviço próprio) que assine tokens. Basta fornecer ao gateway a chave pública (JWKS) para verificação da assinatura.
2. **Contexto da requisição:** Quando chega uma requisição HTTP, o PgArachne verifica o JWT, extrai os claims (como ID do usuário e seu papel) e abre uma transação no PostgreSQL.
3. **Isolamento no nível da transação:** Logo no início da transação, o gateway executa uma série de comandos de configuração de contexto:
 – ```sql
   SET LOCAL ROLE authenticated;
   SELECT set_config('app.current_user_id', '123e4567-e89b-12d3-a456-426614174000', true);
   ```
4. **Aplicação das políticas de RLS:** Se você tiver uma política de RLS definida sobre a tabela `orders`, o PostgreSQL garante automaticamente que qualquer consulta subsequente (mesmo que aninhada dentro de uma função complexa) visualize apenas os dados pertencentes àquele usuário:
 – ```sql
   CREATE POLICY order_isolation_policy ON orders
   FOR ALL
   TO authenticated
   USING (user_id = current_setting('app.current_user_id')::uuid);
   ```

Graças a essa abordagem, toda uma classe de vulnerabilidades de segurança do tipo IDOR (Insecure Direct Object Reference) — que comumente surgem por erros do desenvolvedor nos controllers de backend — é completamente eliminada. A segurança é definida de forma declarativa diretamente onde os dados estão.

---

## 3. Distribuição a partir de um único binário: Frontend estático e JAMstack sem concessões

O deployment moderno frequentemente se assemelha a um pesadelo de infraestrutura. É preciso gerenciar containers Docker para o backend Node.js, configurar uma CDN (Content Delivery Network) para distribuir a Single Page Application (React/Vue/Svelte), resolver políticas de CORS (Cross-Origin Resource Sharing) e configurar um proxy reverso (Nginx/Traefik) que una tudo isso.

O PgArachne aborda isso com a praticidade característica da linguagem Go. Ele inclui um servidor de arquivos estáticos integrado e altamente otimizado, o que permite mudar completamente a estratégia de implantação da aplicação.

### Distribuição monolítica com as vantagens de microsserviços

Você pode construir toda a aplicação cliente como um frontend puramente estático — sem server-side rendering (SSR), apenas HTML otimizado, CSS e JavaScript do lado do cliente. Esses arquivos são enviados para uma pasta que o PgArachne serve.

As vantagens dessa abordagem são significativas:

* **Zero de overhead no lado da API:** A aplicação cliente e a API rodam no mesmo domínio, na mesma porta e a partir do mesmo binário. Isso elimina qualquer configuração de CORS e reduz o overhead do handshake de rede (tudo roda por uma única conexão HTTP/2 ou HTTP/3).
* **Cacheabilidade perfeita:** Assets estáticos são imutáveis. O PgArachne gera automaticamente os cabeçalhos corretos de `ETag` e `Cache-Control` para eles. Todo o frontend pode ser cacheado de forma extremamente eficiente diretamente no navegador do usuário ou na borda da rede (Edge/Cloudflare), enquanto o PgArachne processa apenas dados JSON-RPC puros.
* **Simplicidade no CI/CD:** Implantar uma nova versão da aplicação significa apenas baixar um binário, copiar a pasta com o frontend estático e executar. Sem dependências de `node_modules` no ambiente de produção, sem risco de vazamentos de memória de runtimes de backend pesados.

### Comunicação em tempo real sem a complexidade dos WebSockets

Se a aplicação cliente requer dados ao vivo — como notificações em tempo real, atualizações de estoque ou chat — os desenvolvedores geralmente recorrem a WebSockets. Porém, eles consomem muitos recursos, escalam mal por load balancers e requerem lógica stateful complexa no backend.

O PgArachne resolve esse problema com suporte nativo a **Server-Sent Events (SSE)** combinado com o mecanismo de banco de dados `LISTEN/NOTIFY`.

Quando ocorre uma mudança no banco de dados (por exemplo, via trigger), o PostgreSQL dispara um evento:
```sql
NOTIFY channel_orders_updates, '{"order_id": 501, "status": "shipped"}';
```
O PgArachne captura aquela notificação e a encaminha imediatamente pela conexão HTTP aberta para o frontend usando a interface padrão `EventSource` do JavaScript no cliente:

```javascript
const evtSource = new EventSource("/api/stream?channel=orders_updates");
evtSource.onmessage = (event) => {
   const data = JSON.parse(event.data);
   console.log("Objednávka aktualizována:", data);
};
```
Tudo funciona de forma unidirecional, eficiente, por meio do protocolo HTTP padrão e sem necessidade de implementar message brokers dedicados como o Redis.

---

## 4. Model Context Protocol (MCP): A era das aplicações sem interface gráfica (Zero-UI)

A ruptura tecnológica mais interessante que o PgArachne traz, porém, não diz respeito à economia de linhas de código no desenvolvimento web clássico, mas à integração com o ecossistema de inteligência artificial por meio do **Model Context Protocol (MCP)**.

O MCP é um protocolo aberto (originalmente concebido pela Anthropic) que define uma forma uniforme pela qual modelos LLM (como Claude, GPT ou modelos locais) podem se comunicar com segurança com fontes de dados externas, sistemas de arquivos e interfaces de aplicações. O PgArachne inclui uma implementação nativa de servidor MCP.

### API autodocumentada como conjunto de ferramentas (Tools)

Quando você conecta o PgArachne a um ambiente de desenvolvimento (como Cursor, Claude Desktop ou um agente autônomo próprio), o gateway realiza a introspecção das funções SQL disponíveis e as apresenta ao modelo de IA como suas ferramentas internas (*tools*).

O elemento-chave são os comentários SQL padrão. Modelos de IA não precisam ler o código-fonte das tabelas — precisam de semântica compreensível. O PgArachne pega o texto do comando `COMMENT ON FUNCTION` e o repassa ao LLM como instrução de sistema para aquela ferramenta.

Se o modelo receber a tarefa de verificar o estado do negócio, ele olhará para o schema de ferramentas e encontrará uma função com a descrição: *«Retorna o faturamento total e o número de pedidos para o período especificado.»* O modelo entende por si mesmo quais parâmetros (`date_from`, `date_to`) deve gerar, monta uma requisição JSON-RPC válida, o PgArachne a executa com segurança e o modelo interpreta os dados brutos para o usuário em texto compreensível ou em um gráfico.

### O conceito Zero-UI: Quando a interface gráfica nem chega a existir

Para um grande número de sistemas corporativos internos, ferramentas analíticas, interfaces B2 B ou consoles administrativas, a criação de uma interface gráfica do usuário (GUI) é puro desperdício de tempo de engenharia. Desenvolvedores passam semanas criando tabelas, filtros, select-boxes e gráficos só para que um gerente ou analista possa clicar e exportar dados.

Com a arquitetura PgArachne + MCP, abre-se o caminho para o chamado **Zero-UI (interface zero)**:

1. **Nenhum código de frontend:** Você não cria nenhum React, nenhum formulário, nenhum CSS.
2. **Linguagem natural como interface universal:** O usuário se comunica diretamente com o agente de IA (por exemplo, via chat ou interface de voz).
3. **Execução autônoma:** O usuário digita: *«Encontre para mim os 5 principais clientes que gastaram mais dinheiro conosco este mês, mas cujo último pedido foi há mais de 10 dias. Quero enviar um e-mail de retenção para eles.»*
4. **Processamento:** O agente de IA identifica as funções necessárias expostas pelo PgArachne, extrai os dados precisos de forma transacional e segura (via RLS), os formata em uma tabela clara e já sugere os textos dos e-mails.

A lógica de negócio e a integridade dos dados permanecem cem por cento sob controle no PostgreSQL, a transferência de dados é garantida pelo servidor Go ultrarrápido e a camada de usuário flexível é gerada dinamicamente pela IA de acordo com a necessidade atual do usuário.

---

## 5. Quando (não) usar esta arquitetura: Limites e riscos

Toda decisão arquitetural é um trade-off. A arquitetura «banco de dados como backend» não é uma bala de prata e tem limites específicos que precisam ser avaliados antes da adoção.

### Cenários adequados (Sweet Spots)
* **Aplicações intensivas em dados e MVPs:** Projetos onde a velocidade de entrada no mercado é crítica e a maioria das operações são transações sobre o schema do banco de dados.
* **Ferramentas corporativas internas e sub-sistemas de ERP:** Sistemas onde o requisito principal é segurança, velocidade de busca e possibilidade de fácil integração com agentes de IA para relatórios.
* **Aplicações com altas demandas de atualizações em tempo real:** Graças à conexão direta entre SSE e `NOTIFY`, sem necessidade de construir infraestrutura complexa para WebSockets.

### Cenários inadequados (Quando preferir um backend clássico)
* **Forte dependência de terceiros externos:** Se sua API precisa se comunicar com três outras APIs REST (Stripe, Salesforce, microsserviços internos) a cada requisição, escrever essas integrações diretamente em PL/pgSQL (por exemplo, via extensão `http`) costuma ser trabalhoso e difícil de testar. Aqui, um backend clássico em Go ou Node.js é mais adequado.
* **Operações computacionalmente pesadas (CPU-bound):** O PostgreSQL é projetado para operações de I/O eficientes e gerenciamento de dados. Se a aplicação requer processamento complexo de imagens, criptografia avançada ou simulações matemáticas pesadas, a execução dentro do processo do banco de dados pode bloquear recursos para outras transações.
* **Orquestração complexa de microsserviços:** Em sistemas distribuídos onde o banco de dados é apenas um dos muitos componentes e a lógica de negócio requer coordenação segundo padrões como Saga ou Event Sourcing, a camada de backend clássica desempenha o papel de orquestrador — algo que o banco de dados por si só não consegue fazer de forma eficiente.

---

## Conclusão: Pragmatismo enxuto para a era moderna

A arquitetura construída sobre a combinação de PostgreSQL, PgArachne e Model Context Protocol representa um retorno radical à sobriedade técnica. Ela demonstra que grande parte da complexidade que introduzimos em projetos de software modernos é causada apenas pelo esforço contínuo de transferir e transformar dados entre camadas incompatíveis.

Ao remover as camadas intermediárias — ou seja, ao eliminar a aplicação de backend clássica e substituí-la por um gateway fino e altamente otimizado — obtemos um sistema com overhead mínimo, extremamente fácil de implantar e nativamente preparado para integração com IA. O futuro do desenvolvimento não precisa residir na escrita de milhares de linhas de código de trânsito, mas na definição precisa do modelo de dados e da lógica de negócio diretamente onde os dados estão em casa.
