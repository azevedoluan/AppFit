# AppFit — Progressive Web App (PWA) de Treino & Periodização

**AppFit** é um Progressive Web App moderno, de alta performance e responsivo, desenvolvido especificamente para smartphone (Android e iOS). Ele replica com precisão estética o layout escuro esportivo, focado em facilidade de uso durante a academia, controle motor, registro de cargas e descanso orientado.

![AppFit Preview](/public/favicon.svg)

---

## 🌟 Principais Funcionalidades

1. **Progressive Web App (PWA) Completo:**
   - Pode ser instalado diretamente na tela inicial do celular como um aplicativo nativo.
   - Suporte a instalação tanto no **Android (Chrome)** quanto no **iOS (Safari)** através do botão integrado "Salvar App no Celular".
   - Funciona **100% offline**, armazenando treinos e progresso no dispositivo.

2. **Ficha de Treino Oficial do Luan Azevedo Pré-carregada:**
   - **Segunda-feira:** Superiores A (11 exercícios)
   - **Terça-feira:** Inferiores A (8 exercícios — layout idêntico à foto de referência)
   - **Quarta-feira:** Superiores B (11 exercícios)
   - **Quinta-feira:** Inferiores B (8 exercícios)
   - **Sexta-feira:** Superiores C (10 exercícios)

3. **Importação e Registro Flexível:**
   - **Importação por Planilha:** Suporte a arquivos Excel (`.xlsx`, `.xls`) e CSV, com detecção automática dos dias e exercícios.
   - **Importação por Foto / Imagem:** Carregamento de fotos da ficha física da academia com interpretador de texto e gerador de cronograma.
   - **Cadastro Manual:** Formulário simples para adicionar dias, exercícios, séries, repetições e orientações.

4. **Execução de Treino & Cronômetro Inteligente:**
   - Barra de progresso de treino em tempo real com indicador de conclusão (ex: 0/13 - 0%).
   - Registro de carga individual por série (kg).
   - Botão **Marcar / Feito** com feedback sonoro e tátil (vibração).
   - Cronômetro de descanso sugerido com chips rápidos (45s, 60s, 90s, 120s), contagem regressiva e bip de aviso.
   - Comemoração com confete ao completar todos os exercícios do dia.

5. **Exportação & Backup:**
   - Exportação do plano de treino atualizado para planilha Excel (`.xlsx`).
   - Backup e restauração completos em formato JSON.

6. **Pronto para Hospedagem Gratuita na Oracle Cloud (OCI):**
   - Configuração com `Dockerfile` multi-stage e `docker-compose.yml`.
   - Guia completo em [DEPLOY_OCI.md](DEPLOY_OCI.md).

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js** (v20+) e **Git** instalados na máquina (já configurados no sistema).

### Comandos

```bash
# Entrar na pasta do projeto
cd AppFit

# Iniciar servidor de desenvolvimento local
npm run dev
```

Abra o link exibido no terminal (geralmente `http://localhost:5173`) no seu navegador. Para testar no celular na mesma rede Wi-Fi, execute:

```bash
npm run dev -- --host
```

E acesse pelo endereço IP local mostrado (ex: `http://192.168.1.X:5173`).

---

## 📦 Estrutura do Projeto

```
AppFit/
├── public/                 # Favicon, ícones PWA (192px, 512px) e manifest
├── src/
│   ├── components/         # Componentes React modulares
│   │   ├── DaySelector.tsx       # Ciclo semanal e botões de transição
│   │   ├── ExerciseCard.tsx      # Cartões de exercícios com séries e timer
│   │   ├── Header.tsx            # Cabeçalho com perfil e progresso
│   │   ├── ImportModal.tsx       # Modal de importação (Planilha / Foto / Manual)
│   │   ├── PWAInstallModal.tsx   # Instruções de instalação PWA (iOS e Android)
│   │   ├── RestTimer.tsx         # Cronômetro flutuante de descanso
│   │   ├── SettingsModal.tsx     # Configurações de perfil e exportação Excel
│   │   └── WorkoutHeader.tsx     # Título do treino do dia e botões expandir/recolher
│   ├── data/
│   │   └── initialWorkouts.ts    # Ficha completa de treinos do Luan Azevedo
│   ├── types/
│   │   └── workout.ts            # Interfaces TypeScript
│   ├── utils/
│   │   ├── importUtils.ts        # Leitura de planilhas Excel e texto OCR
│   │   └── sound.ts              # Efeitos sonoros via Web Audio API e vibração
│   ├── App.tsx                   # Aplicação principal
│   ├── index.css                 # Estilos Tailwind e tema escuro
│   └── main.tsx                  # Ponto de entrada
├── Dockerfile              # Imagem Docker multi-stage com Nginx
├── docker-compose.yml      # Orquestração para Oracle Cloud OCI
├── DEPLOY_OCI.md           # Guia de publicação na nuvem Always Free da Oracle
└── vite.config.ts          # Configuração Vite com vite-plugin-pwa
```
