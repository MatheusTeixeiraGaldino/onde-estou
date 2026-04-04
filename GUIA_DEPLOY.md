# 🚀 GUIA COMPLETO — Onde Estou
## Do zero ao online em ~30 minutos, tudo por copy/paste, sem instalar nada

---

## 📋 LISTA DE ARQUIVOS QUE VOCÊ VAI CRIAR

Estrutura final do projeto:

```
onde-estou/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
├── .gitignore
├── .env.example
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── firebase.js
    ├── contexts/
    │   └── AuthContext.jsx
    ├── components/
    │   ├── Layout.jsx
    │   ├── LoadingSpinner.jsx
    │   ├── Modal.jsx
    │   └── LocationWidget.jsx
    └── pages/
        ├── LoginPage.jsx
        ├── RegisterPage.jsx
        ├── HomePage.jsx
        ├── PeoplePage.jsx
        ├── EventsPage.jsx
        ├── MeetingsPage.jsx
        ├── GoalsPage.jsx
        ├── CalendarPage.jsx
        └── ProfilePage.jsx
```

---

## PARTE 1 — CRIAR O FIREBASE (5 minutos)

### Passo 1.1 — Criar conta/projeto no Firebase

1. Acesse **https://console.firebase.google.com**
2. Faça login com sua conta Google
3. Clique em **"Criar um projeto"**
4. Nome do projeto: `onde-estou` → Clique em **Continuar**
5. Google Analytics: pode desativar → **Criar projeto**
6. Aguarde alguns segundos → **Continuar**

---

### Passo 1.2 — Ativar Autenticação

1. No menu lateral esquerdo, clique em **"Build"** → **"Authentication"**
2. Clique em **"Começar"**
3. Na aba **"Sign-in method"**, clique em **"Email/senha"**
4. Ative o primeiro toggle **(Email/senha)** → **Salvar**

---

### Passo 1.3 — Criar o Firestore

1. No menu lateral, clique em **"Build"** → **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Escolha **"Iniciar no modo de teste"** → **Avançar**
4. Escolha a região mais próxima (ex: `southamerica-east1`) → **Ativar**
5. Aguarde criar

**IMPORTANTE — Regras de segurança:**
Após criar, vá em **Regras** e substitua o conteúdo por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Clique em **Publicar**.

---

### Passo 1.4 — Obter as credenciais do Firebase

1. Clique na engrenagem ⚙️ ao lado de "Project Overview" → **Configurações do projeto**
2. Role para baixo até **"Seus apps"**
3. Clique no ícone **`</>`** (Web)
4. Nome do app: `onde-estou-web` → **Registrar app**
5. Você verá um bloco `firebaseConfig` com estas chaves:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "onde-estou-xxxxx.firebaseapp.com",
  projectId: "onde-estou-xxxxx",
  storageBucket: "onde-estou-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

**⚠️ COPIE E GUARDE ESSES VALORES — você vai precisar deles em breve!**

Clique em **"Continuar no console"**.

---

## PARTE 2 — CRIAR O REPOSITÓRIO NO GITHUB (5 minutos)

### Passo 2.1 — Criar conta e repositório

1. Acesse **https://github.com** e crie uma conta (se não tiver)
2. Clique em **"New"** (botão verde) ou **"+"** → **"New repository"**
3. Preencha:
   - **Repository name:** `onde-estou`
   - **Description:** Sistema de gestão de pessoas e localização
   - Marque **Public**
   - ✅ Marque **"Add a README file"**
4. Clique em **"Create repository"**

---

### Passo 2.2 — Criar os arquivos no GitHub (pelo site, sem instalar nada!)

Para cada arquivo, você vai:
1. Clicar em **"Add file"** → **"Create new file"**
2. Digitar o nome/caminho do arquivo
3. Colar o conteúdo
4. Clicar em **"Commit changes"** → **"Commit directly to main"** → **"Commit changes"**

#### Ordem de criação dos arquivos:

**Arquivo 1: `package.json`**
- Nome: `package.json`
- Cole o conteúdo do arquivo package.json

**Arquivo 2: `vite.config.js`**
- Nome: `vite.config.js`

**Arquivo 3: `tailwind.config.js`**
- Nome: `tailwind.config.js`

**Arquivo 4: `postcss.config.js`**
- Nome: `postcss.config.js`

**Arquivo 5: `vercel.json`**
- Nome: `vercel.json`

**Arquivo 6: `.gitignore`**
- Nome: `.gitignore`

**Arquivo 7: `.env.example`**
- Nome: `.env.example`

**Arquivo 8: `index.html`**
- Nome: `index.html`

**Arquivo 9: `src/main.jsx`**
- Nome: `src/main.jsx`
  *(O GitHub cria a pasta `src/` automaticamente ao digitar a barra)*

**Arquivo 10: `src/App.jsx`**

**Arquivo 11: `src/index.css`**

**Arquivo 12: `src/firebase.js`**

**Arquivo 13: `src/contexts/AuthContext.jsx`**

**Arquivo 14: `src/components/Layout.jsx`**

**Arquivo 15: `src/components/LoadingSpinner.jsx`**

**Arquivo 16: `src/components/Modal.jsx`**

**Arquivo 17: `src/components/LocationWidget.jsx`**

**Arquivo 18: `src/pages/LoginPage.jsx`**

**Arquivo 19: `src/pages/RegisterPage.jsx`**

**Arquivo 20: `src/pages/HomePage.jsx`**

**Arquivo 21: `src/pages/PeoplePage.jsx`**

**Arquivo 22: `src/pages/EventsPage.jsx`**

**Arquivo 23: `src/pages/MeetingsPage.jsx`**

**Arquivo 24: `src/pages/GoalsPage.jsx`**

**Arquivo 25: `src/pages/CalendarPage.jsx`**

**Arquivo 26: `src/pages/ProfilePage.jsx`**

---

## PARTE 3 — DEPLOY NA VERCEL (5 minutos)

### Passo 3.1 — Criar conta na Vercel

1. Acesse **https://vercel.com**
2. Clique em **"Sign Up"**
3. Escolha **"Continue with GitHub"** (use a mesma conta do GitHub)
4. Autorize a Vercel a acessar seu GitHub

---

### Passo 3.2 — Importar o projeto

1. Na dashboard da Vercel, clique em **"Add New..."** → **"Project"**
2. Em "Import Git Repository", você verá seu repositório `onde-estou`
3. Clique em **"Import"** ao lado dele

---

### Passo 3.3 — ⚠️ CONFIGURAR AS VARIÁVEIS DE AMBIENTE (PASSO CRÍTICO)

Antes de clicar em Deploy, você PRECISA adicionar as variáveis do Firebase!

1. Na tela de configuração do projeto, procure por **"Environment Variables"**
2. Adicione **uma por uma** as seguintes variáveis:

| Name | Value |
|------|-------|
| `VITE_FIREBASE_API_KEY` | (seu apiKey do Firebase) |
| `VITE_FIREBASE_AUTH_DOMAIN` | (seu authDomain) |
| `VITE_FIREBASE_PROJECT_ID` | (seu projectId) |
| `VITE_FIREBASE_STORAGE_BUCKET` | (seu storageBucket) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (seu messagingSenderId) |
| `VITE_FIREBASE_APP_ID` | (seu appId) |

Para cada variável:
- Cole o nome no campo **"Key"**
- Cole o valor no campo **"Value"**
- Clique em **"Add"**

---

### Passo 3.4 — Deploy!

1. Após adicionar todas as variáveis, clique em **"Deploy"**
2. Aguarde 2-3 minutos enquanto a Vercel constrói o projeto
3. Quando aparecer os confetes 🎉 e **"Congratulations!"**, está no ar!
4. Clique em **"Continue to Dashboard"**
5. Sua URL estará disponível, algo como: `https://onde-estou.vercel.app`

---

### Passo 3.5 — Autorizar o domínio no Firebase

Para o Firebase Auth funcionar com sua URL da Vercel:

1. Volte ao **Firebase Console**
2. Vá em **Authentication** → **Settings** → **Authorized domains**
3. Clique em **"Add domain"**
4. Cole sua URL da Vercel (ex: `onde-estou.vercel.app`) → **Add**

---

## PARTE 4 — TESTAR O SISTEMA ✅

1. Acesse sua URL da Vercel
2. Clique em **"Cadastrar-se"**
3. Crie seu primeiro usuário como **Admin**
4. Faça login e explore todas as funcionalidades!

---

## 🔄 COMO ATUALIZAR O SISTEMA DEPOIS

Sempre que quiser mudar algum arquivo:
1. Vá ao GitHub → Encontre o arquivo
2. Clique no ícone de **lápis** ✏️
3. Faça a alteração
4. Clique em **"Commit changes"**
5. A Vercel detecta automaticamente e faz novo deploy em ~2 minutos!

---

## ❓ PROBLEMAS COMUNS

**"Erro de autenticação / auth/invalid-credential"**
→ Verifique se as variáveis de ambiente foram salvas corretamente na Vercel
→ Verifique se Email/Senha está ativado no Firebase Auth

**"Tela em branco após deploy"**
→ Na Vercel, vá em Deployments → clique no deploy → veja os logs de erro
→ Geralmente é variável de ambiente errada

**"Permissão negada no Firestore"**
→ Verifique se você publicou as regras de segurança no Passo 1.3

**"Página não encontrada ao atualizar"**
→ Verifique se o arquivo `vercel.json` foi criado corretamente

---

## 🎨 RESUMO DO SISTEMA

| Módulo | Funcionalidade |
|--------|----------------|
| 🔐 Login/Cadastro | Firebase Auth com email/senha |
| 📍 Localização | Registro manual, histórico, widget na home |
| 👥 Pessoas | Lista com busca, departamento, localização atual |
| 📅 Eventos | CRUD completo + RSVP (confirmar presença) |
| 📝 Atas | Registro completo, edição, vinculação a eventos |
| ✅ Metas | Metas com checklist, progresso automático, alertas |
| 🗓️ Calendário | Visual mensal com eventos e aniversários |
| 🎂 Aniversários | Exibição automática na home |
| 👤 Perfil | Edição de dados, histórico de localização |

---

## 🔒 SEGURANÇA

- Nunca compartilhe seu arquivo `.env.local`
- As variáveis ficam salvas com segurança na Vercel
- O Firestore só permite acesso a usuários logados
- Para produção real, refine as regras do Firestore por perfil

---

**✅ Pronto! Seu sistema está 100% online, sem instalar nada!**
