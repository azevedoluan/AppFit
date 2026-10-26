# Guia de Publicação do AppFit na Oracle Cloud (OCI Always Free)

Este guia explica passo a passo como colocar o **AppFit** no ar utilizando as máquinas virtuais **100% gratuitas para sempre (Always Free)** da Oracle Cloud Infrastructure (OCI).

---

## 1. Criar a Instância Gratuita na Oracle Cloud

1. Acesse o console da [Oracle Cloud](https://cloud.oracle.com/).
2. No menu principal, vá em **Compute > Instances** e clique em **Create Instance**.
3. Escolha:
   - **Nome:** `appfit-server`
   - **Imagem:** **Ubuntu 24.04** ou **Ubuntu 22.04 LTS**
   - **Shape (Hardware):**
     - **Opção A (Recomendada):** Ampere (ARM) com até 4 OCPUs e 24 GB de RAM (Always Free).
     - **Opção B:** AMD VM.Standard.E2.1.Micro (1 OCPU, 1 GB RAM - Always Free).
4. Baixe a **chave privada SSH** (`.key` ou `.pem`) para acessar a máquina.
5. Clique em **Create**.

---

## 2. Liberar as Portas 80 e 443 na Oracle Cloud

Para que seu celular consiga acessar o AppFit pela internet:

1. No painel da instância, clique na sua **Subnet / VCN**.
2. Clique na **Default Security List**.
3. Clique em **Add Ingress Rules** e crie as regras:
   - **Porta 80 (HTTP):**
     - Source CIDR: `0.0.0.0/0`
     - IP Protocol: `TCP`
     - Destination Port Range: `80`
   - **Porta 443 (HTTPS):**
     - Source CIDR: `0.0.0.0/0`
     - IP Protocol: `TCP`
     - Destination Port Range: `443`

---

## 3. Conectar na Máquina via SSH e Instalar o Docker

No seu terminal local (ou PowerShell):

```bash
ssh -i /caminho/para/sua_chave.key ubuntu@<IP_PUBLICO_DA_SUA_VM>
```

Atualize o sistema e instale Docker + Docker Compose:

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Docker e Git
sudo apt install -y docker.io docker-compose-v2 git

# Permitir executar docker sem sudo
sudo usermod -aG docker $USER
newgrp docker

# Liberar firewall interno do Ubuntu
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true
```

---

## 4. Clonar o Repositório e Iniciar o AppFit

```bash
# Clone seu repositório Git
git clone <URL_DO_SEU_REPOSITORIO_GIT> appfit
cd appfit

# Inicie o container em produção
docker compose up -d --build
```

Pronto! Acesse no navegador do seu celular: `http://<IP_PUBLICO_DA_SUA_VM>`

---

## 5. Dica de Ouro: HTTPS Gratuito com Cloudflare Tunnel (Sem Abrir Portas)

Para que recursos nativos de PWA (como instalação sem avisos de segurança) funcionem com 100% de precisão no iOS e Android, o protocolo **HTTPS** é ideal:

1. Crie uma conta gratuita na [Cloudflare](https://www.cloudflare.com/) e adicione um domínio (ex: `seunome.com` ou use serviços como No-IP/DuckDNS).
2. Na aba **Zero Trust > Networks > Tunnels**, crie um túnel apontando para `http://localhost:80`.
3. Você ganha SSL/HTTPS automático, proteção DDoS e acesso global pelo seu smartphone!
