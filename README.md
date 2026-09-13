# 🎮 Painel Tático de Lineup - Valorant

Site responsivo e mobile-first criado especialmente para equipes de Valorant (com foco em times femininos/mistos) organizarem suas composições de agentes por mapa antes de campeonatos e treinos.

---

## ⚡ Recursos Principais

- **6 Mapas Oficiais:** Ascent, Haven, Lotus, Split, Sunset e Abyss.
- **3 Composições Sugeridas por Mapa:** Estruturadas com foco tático (Padrão Meta, Informação, Pressão, etc.) e botão de **1 clique para carregar a comp** para o time.
- **Módulo Interativo de 5 Jogadoras:** 
  - Nome da jogadora editável.
  - Seleção de **Agente Titular** ⭐ e **Agente Reserva** 🔄 com modal visual dividido por funções (Duelistas, Iniciadores, Controladores, Sentinelas).
- **Sincronização em Tempo Real (Google Firebase):** 
  - Atualização instantânea nas telas de todas as jogadoras e do coach no mesmo segundo.
  - Sem necessidade de servidor backend próprio (100% cliente / serverless).
  - Fallback automático para `LocalStorage` caso esteja offline.
- **Exportação Rápida para WhatsApp:**
  - Gera resumos formatados com emojis do mapa atual ou da lista completa de todos os mapas.
  - Botão de "Copiar Texto" e botão de "Abrir no WhatsApp".

---

## 🚀 Como Executar Localmente

### Opção 1: Com VS Code (Mais Fácil)
1. Abra esta pasta no **Visual Studio Code**.
2. Instale a extensão **Live Server** (se ainda não tiver).
3. Clique com o botão direito em `index.html` e selecione **"Open with Live Server"**.

### Opção 2: Com Python ou Node
No terminal dentro da pasta:
```bash
# Com Python 3:
python -m http.server 3000

# Ou com npx:
npx serve
```
Acesse no navegador: `http://localhost:3000`.

---

## 🌐 Como Publicar na Internet Grátis (Para o time acessar pelo WhatsApp)

### Via GitHub Pages (1 Clique):
1. Faça o commit e push dos arquivos para o seu repositório no GitHub:
   ```bash
   git add .
   git commit -m "feat: Painel de Lineup Valorant com Sincronizacao em Tempo Real"
   git push origin main
   ```
2. No GitHub, acesse a aba **Settings** do repositório.
3. No menu lateral esquerdo, clique em **Pages**.
4. Em **Branch**, selecione `main` e a pasta `/ (root)`, depois clique em **Save**.
5. Pronto! Em 1 minuto o GitHub vai gerar um link público (ex: `https://seu-usuario.github.io/PainelValorant`) para você mandar no grupo do WhatsApp das jogadoras!

---

## 🔥 Como Configurar o Firebase Realtime Database (Passo a Passo de 2 Minutos)

Para que a tela de todas as 5 jogadoras e a sua atualizem simultaneamente em tempo real:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/) e entre com sua conta Google.
2. Clique em **Adicionar projeto** (digite um nome como `lineup-valorant` e desative o Google Analytics para ser mais rápido).
3. No menu lateral esquerdo, vá em **Criação (Build)** > **Realtime Database**.
4. Clique no botão **Criar banco de dados**:
   - Escolha o local (pode ser Estados Unidos / `us-central1`).
   - Na etapa de regras, selecione **Iniciar no modo de teste**.
5. Vá na aba **Regras (Rules)** do Realtime Database e certifique-se de que estão assim para permitir que o time edite sem login:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
   *(Clique em "Publicar")*.
6. Agora clique no ícone de **Engrenagem (Configurações do Projeto)** no topo do menu lateral:
   - Na aba "Geral", role até a seção **Seus aplicativos** e clique no ícone da Web `</>`.
   - Dê um apelido (ex: `Painel Web`) e clique em Registrar aplicativo.
   - O Firebase vai exibir um código com `const firebaseConfig = { ... };`.
7. **Abra o seu site**, clique no botão **Sincronização** (ou na pílula amarela "Modo Local") e **cole esse bloco de código**.
8. Clique em **Salvar e Conectar**. Pronto! O status mudará para `🟢 Tempo Real Ativo`.
