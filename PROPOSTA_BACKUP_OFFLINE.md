# Proposta Técnica: Solução de Backup e Restauração Offline para o App Bifers

## 1. Introdução

A preocupação com a segurança e a disponibilidade dos dados financeiros é fundamental. O aplicativo Bifers, utilizando o Supabase como backend, armazena informações críticas que, em caso de falha ou perda de acesso à internet, podem comprometer a operação. Esta proposta detalha uma solução para realizar backups offline dos dados do aplicativo, permitindo sua restauração em caso de necessidade, garantindo a continuidade e a integridade das informações.

## 2. O Supabase e o Desafio do Backup Offline

O Supabase é uma plataforma de código aberto que oferece um banco de dados PostgreSQL robusto, autenticação, armazenamento de arquivos e APIs em tempo real. Ele já possui mecanismos de backup diário automático e ferramentas de linha de comando (CLI) para exportação de dados do lado do servidor [1] [2]. No entanto, a solicitação do usuário é para um backup **offline** diretamente do aplicativo móvel (React Native/Expo) para um dispositivo como um pendrive, o que apresenta desafios específicos:

*   **Ambiente Móvel:** Aplicativos Expo/React Native rodam em um ambiente sandboxed, com acesso limitado ao sistema de arquivos do dispositivo. O `expo-file-system` é a ferramenta padrão para gerenciar arquivos localmente [3].
*   **Segurança:** Dados financeiros são sensíveis. Armazená-los em um pendrive ou diretamente no dispositivo sem criptografia adequada representa um risco significativo de segurança.
*   **Integridade dos Dados:** Garantir que o backup capture todos os dados relevantes de forma consistente e que a restauração não corrompa o banco de dados.
*   **Experiência do Usuário:** O processo deve ser intuitivo para um usuário não técnico.
*   **Evolução do Esquema:** A estrutura do banco de dados (esquema) pode mudar com o tempo. Restaurar um backup antigo em um esquema novo pode causar incompatibilidades.

## 3. Solução Proposta: Exportação/Importação via JSON

A abordagem mais viável para um backup offline a partir de um aplicativo React Native/Expo é a exportação e importação de dados em formato JSON (JavaScript Object Notation). O JSON é ideal para este cenário por ser legível por humanos, fácil de parsear em JavaScript e capaz de representar a estrutura relacional dos dados do Supabase de forma eficiente.

### 3.1. Processo de Exportação (Backup)

O processo de backup offline envolveria os seguintes passos:

1.  **Seleção de Dados:** O aplicativo precisaria identificar todas as tabelas essenciais para o funcionamento do Bifers (e.g., `clientes`, `contratos`, `movimentacoes_contrato`, `fluxo_pessoal`, `comissionados`).
2.  **Coleta de Dados:** Para cada tabela, o aplicativo faria uma consulta ao Supabase para obter todos os registros. Exemplo:
    ```typescript
    const { data: clientes, error } = await supabase.from('clientes').select('*');
    if (error) throw error;
    // Repetir para outras tabelas
    ```
3.  **Estruturação do Backup:** Os dados coletados de todas as tabelas seriam agrupados em um único objeto JSON, onde cada chave seria o nome da tabela e o valor seria um array dos seus registros. Exemplo:
    ```json
    {
      "clientes": [
        { "id": "...", "nome": "João", ... }
      ],
      "contratos": [
        { "id": "...", "cliente_id": "...", ... }
      ],
      // ... outras tabelas
    }
    ```
4.  **Criptografia (Recomendado):** Antes de salvar, o conteúdo JSON seria criptografado usando uma senha fornecida pelo usuário. Isso adicionaria uma camada crucial de segurança, protegendo os dados caso o arquivo de backup caia em mãos erradas.
5.  **Salvamento Local:** Utilizando o `expo-file-system`, o arquivo JSON criptografado seria salvo em um diretório acessível ao usuário no dispositivo (e.g., pasta de Downloads ou Documentos). Em Android, o `StorageAccessFramework` pode ser usado para permitir que o usuário escolha o local de salvamento [3].
6.  **Compartilhamento:** Após o salvamento, o aplicativo ofereceria a opção de compartilhar o arquivo de backup. Isso permitiria ao usuário transferir o arquivo para um pendrive, serviço de nuvem, e-mail, etc., usando as funcionalidades nativas de compartilhamento do sistema operacional [4].

### 3.2. Processo de Importação (Restauração)

O processo de restauração seria o inverso:

1.  **Seleção do Arquivo:** O usuário selecionaria o arquivo de backup (JSON criptografado) do seu dispositivo.
2.  **Descriptografia:** O aplicativo solicitaria a senha de criptografia e, se correta, descriptografaria o conteúdo do arquivo.
3.  **Validação:** O conteúdo JSON seria validado para garantir que corresponde ao formato esperado e que não está corrompido.
4.  **Limpeza (Opcional, mas Recomendado para Restauração Completa):** Para garantir uma restauração limpa, o aplicativo poderia oferecer a opção de **apagar todos os dados existentes** nas tabelas do Supabase para a moeda ativa antes de importar os novos dados. Isso evitaria duplicatas e inconsistências.
5.  **Importação de Dados:** Os dados seriam inseridos de volta nas tabelas do Supabase. É crucial respeitar a ordem de inserção para evitar problemas de chaves estrangeiras (e.g., inserir `clientes` antes de `contratos`). A função `upsert` do Supabase pode ser útil para atualizar registros existentes ou inserir novos, mas para uma restauração completa, a limpeza prévia é mais segura.
    ```typescript
    // Exemplo de inserção (após limpeza)
    const { error } = await supabase.from('clientes').insert(backupData.clientes);
    if (error) throw error;
    ```
6.  **Feedback:** O usuário receberia feedback sobre o sucesso ou falha da restauração.

## 4. Considerações Técnicas e de Segurança

### 4.1. Criptografia

A criptografia do arquivo de backup é **mandatória** para proteger os dados financeiros. Bibliotecas como `crypto-js` ou as APIs nativas de criptografia do Expo (se disponíveis para uso de chaves simétricas) poderiam ser empregadas. A senha deve ser forte e gerenciada pelo usuário.

### 4.2. Gerenciamento de Esquema

Se o esquema do banco de dados mudar significativamente entre a versão do backup e a versão atual do aplicativo, a restauração pode falhar. Uma solução robusta exigiria um sistema de versionamento do esquema no backup e lógica de migração no aplicativo para adaptar dados antigos a um esquema novo.

### 4.3. Tamanho dos Dados

Para bases de dados muito grandes, a exportação e importação podem ser demoradas e consumir muitos recursos do dispositivo. É importante testar o desempenho com volumes de dados realistas.

### 4.4. Permissões

O `expo-file-system` requer permissões de leitura/escrita no armazenamento do dispositivo, que precisam ser solicitadas ao usuário [3].

### 4.5. Limitações do `expo-file-system`

*   **iOS:** O acesso direto a diretórios arbitrários é mais restrito. O compartilhamento para outros aplicativos ou o iCloud Drive é a forma mais comum de "exportar" um arquivo. O `Sharing.shareAsync()` é a melhor abordagem [4].
*   **Android:** Mais flexível, permitindo que o usuário escolha um local via `StorageAccessFramework` [3].

## 5. Recomendação

Recomendo a implementação de um recurso de **Exportação de Dados** no aplicativo Bifers, com as seguintes características:

*   **Formato:** JSON.
*   **Criptografia:** Opcional, mas fortemente recomendada, com senha definida pelo usuário.
*   **Local de Salvamento:** Permitir que o usuário escolha o local (Downloads, Documentos, ou via compartilhamento).
*   **Compartilhamento:** Integrar com a funcionalidade de compartilhamento nativa do sistema operacional.

Para a **Restauração de Dados**, sugiro uma abordagem mais cautelosa:

*   **Função de Importação:** Implementar uma função de importação que leia o arquivo JSON criptografado.
*   **Aviso Claro:** Apresentar um aviso muito claro ao usuário sobre as consequências da restauração (e.g., "Isso apagará todos os seus dados atuais e os substituirá pelos dados do backup. Tem certeza?").
*   **Validação Rigorosa:** Implementar validações para garantir que o arquivo de backup é válido e compatível com o esquema atual do aplicativo.

Essa solução oferece um bom equilíbrio entre a necessidade de backup offline e as limitações de segurança/plataforma de um aplicativo móvel. É um recurso valioso para a tranquilidade do usuário.

## 6. Referências

[1] Supabase Docs. *Database Backups*. Disponível em: <https://supabase.com/docs/guides/platform/backups>
[2] Supabase Docs. *Backup and Restore using the CLI*. Disponível em: <https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore>
[3] Expo Documentation. *FileSystem*. Disponível em: <https://docs.expo.dev/versions/latest/sdk/filesystem/>
[4] Expo Documentation. *Sharing*. Disponível em: <https://docs.expo.dev/versions/latest/sdk/sharing/>
