// Elementos da UI
const contactsList = document.getElementById('contactsList');
const messageText = document.getElementById('messageText');
const mediaPreview = document.getElementById('mediaPreview');
const statusList = document.getElementById('statusList');
const sendProgress = document.getElementById('sendProgress');
const templatesList = document.getElementById('templatesList');

// Botões
const btnImportCSV = document.getElementById('btnImportCSV');
const btnImportJSON = document.getElementById('btnImportJSON');
const btnAddContact = document.getElementById('btnAddContact');
const btnGPT = document.getElementById('btnGPT');
const btnTemplate = document.getElementById('btnTemplate');
const btnVariables = document.getElementById('btnVariables');
const btnAddMedia = document.getElementById('btnAddMedia');
const btnSend = document.getElementById('btnSend');
const btnConfig = document.getElementById('btnConfig');

// Estado da aplicação
let contacts = [];
let mediaFiles = [];
let gptApiKey = localStorage.getItem('gptApiKey') || '';
let messageInterval = parseInt(localStorage.getItem('messageInterval')) || 5;
let templates = JSON.parse(localStorage.getItem('templates') || '[]');
let variables = JSON.parse(localStorage.getItem('variables') || '{}');

// Estado da conversa
let conversationHistory = [];
let currentContext = {
    client_name: '',
    subject: '',
    mood: 'Neutro',
    last_interaction: ''
};

// Configuração dos modais
const configModal = new bootstrap.Modal(document.getElementById('configModal'));
const templateModal = new bootstrap.Modal(document.getElementById('templateModal'));
document.getElementById('btnSaveConfig').addEventListener('click', saveConfig);
document.getElementById('btnSaveTemplate').addEventListener('click', saveCurrentTemplate);

// Eventos dos botões
btnImportCSV.addEventListener('click', importCSV);
btnImportJSON.addEventListener('click', importJSON);
btnAddContact.addEventListener('click', addContact);
btnGPT.addEventListener('click', generateGPTMessage);
btnTemplate.addEventListener('click', showTemplates);
btnVariables.addEventListener('click', showVariables);
btnAddMedia.addEventListener('click', addMedia);
btnSend.addEventListener('click', sendMessages);
btnConfig.addEventListener('click', () => configModal.show());

// Funções de importação
async function importCSV() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            const text = await file.text();
            const rows = text.split('\n');
            
            contacts = rows.map(row => {
                const [name, number] = row.split(',');
                return { name: name.trim(), number: number.trim(), status: 'pending' };
            }).filter(contact => contact.number);
            
            updateContactsList();
        };
        
        input.click();
    } catch (error) {
        showError('Erro ao importar CSV: ' + error.message);
    }
}

async function importJSON() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            const text = await file.text();
            contacts = JSON.parse(text);
            updateContactsList();
        };
        
        input.click();
    } catch (error) {
        showError('Erro ao importar JSON: ' + error.message);
    }
}

// Função para adicionar contato manualmente
function addContact() {
    const name = prompt('Nome do contato:');
    const number = prompt('Número do WhatsApp:');
    
    if (name && number) {
        contacts.push({ name, number, status: 'pending' });
        updateContactsList();
    }
}

// Funções de mídia
async function addMedia() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*';
    
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        mediaFiles.push(...files);
        updateMediaPreview();
    };
    
    input.click();
}

function updateMediaPreview() {
    mediaPreview.innerHTML = mediaFiles.map((file, index) => `
        <div class="media-item">
            ${file.type.startsWith('image') 
                ? `<img src="${URL.createObjectURL(file)}" alt="Media ${index + 1}">`
                : `<video src="${URL.createObjectURL(file)}" style="width:100%;height:100%"></video>`
            }
            <button class="remove-media" onclick="removeMedia(${index})">×</button>
        </div>
    `).join('');
}

function removeMedia(index) {
    mediaFiles.splice(index, 1);
    updateMediaPreview();
}

// Integração com GPT
async function generateGPTMessage() {
    if (!gptApiKey) {
        showError('Configure sua chave API do GPT nas configurações');
        configModal.show();
        return;
    }

    const prompt = prompt('Descreva a mensagem que você quer gerar:');
    if (!prompt) return;

    try {
        const response = await fetch('http://localhost:8000/generate-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${gptApiKey}`
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) throw new Error('Erro ao gerar mensagem');
        
        const data = await response.json();
        messageText.value = data.message;
    } catch (error) {
        showError('Erro ao gerar mensagem com GPT: ' + error.message);
    }
}

// Funções de envio
async function sendMessages() {
    if (contacts.length === 0) {
        showToast('Erro', 'Nenhum contato selecionado', 'error');
        return;
    }

    const message = messageText.value;
    if (!message) {
        showToast('Erro', 'Digite uma mensagem', 'error');
        return;
    }

    sendProgress.style.width = '0%';
    statusList.innerHTML = '';
    let success = 0;
    let failed = 0;

    for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        try {
            const processedMessage = processVariables(message, contact);
            await window.whatsapp.sendMessage(contact.phone, processedMessage, mediaFiles);
            addStatus(contact.name, 'Mensagem enviada com sucesso', 'success');
            success++;
        } catch (error) {
            addStatus(contact.name, `Erro ao enviar mensagem: ${error.message}`, 'danger');
            failed++;
        }

        const progress = ((i + 1) / contacts.length) * 100;
        sendProgress.style.width = `${progress}%`;
        
        if (i < contacts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, messageInterval * 1000));
        }
    }

    showToast('Envio concluído', `Sucesso: ${success} | Falhas: ${failed}`, success === contacts.length ? 'success' : 'warning');
}

// Funções de UI
function updateContactsList() {
    contactsList.innerHTML = contacts.map(contact => `
        <div class="contact-item">
            <div class="contact-status ${contact.status}"></div>
            <div>
                <div>${contact.name || 'Sem nome'}</div>
                <small class="text-muted">${contact.number}</small>
            </div>
        </div>
    `).join('');
}

function updateStatus(contact, type, message = '') {
    const statusDiv = document.createElement('div');
    statusDiv.className = `alert alert-${type} alert-dismissible fade show`;
    statusDiv.innerHTML = `
        ${contact.name || contact.number}: ${message || 'Mensagem enviada com sucesso'}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    statusList.prepend(statusDiv);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    statusList.prepend(errorDiv);
}

// Configurações
function saveConfig() {
    const newApiKey = document.getElementById('gptApiKey').value;
    const newInterval = document.getElementById('messageInterval').value;

    localStorage.setItem('gptApiKey', newApiKey);
    localStorage.setItem('messageInterval', newInterval);

    gptApiKey = newApiKey;
    messageInterval = parseInt(newInterval);

    configModal.hide();
}

// Funções de gerenciamento de templates
function saveCurrentTemplate() {
    const templateName = document.getElementById('templateName').value;
    const templateContent = document.getElementById('templateContent').value;
    
    if (!templateName || !templateContent) {
        showToast('Erro', 'Nome e conteúdo do template são obrigatórios', 'error');
        return;
    }

    const templateIndex = templates.findIndex(t => t.name === templateName);
    if (templateIndex >= 0) {
        templates[templateIndex] = { name: templateName, content: templateContent };
    } else {
        templates.push({ name: templateName, content: templateContent });
    }

    localStorage.setItem('templates', JSON.stringify(templates));
    updateTemplatesList();
    showToast('Sucesso', 'Template salvo com sucesso!', 'success');
    templateModal.hide();
}

function updateTemplatesList() {
    templatesList.innerHTML = '';
    templates.forEach((template, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            <span>${template.name}</span>
            <div>
                <button class="btn btn-sm btn-primary me-2" onclick="editTemplate(${index})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteTemplate(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        templatesList.appendChild(li);
    });
}

function editTemplate(index) {
    const template = templates[index];
    document.getElementById('templateName').value = template.name;
    document.getElementById('templateContent').value = template.content;
    templateModal.show();
}

function deleteTemplate(index) {
    if (confirm('Tem certeza que deseja excluir este template?')) {
        templates.splice(index, 1);
        localStorage.setItem('templates', JSON.stringify(templates));
        updateTemplatesList();
        showToast('Sucesso', 'Template excluído com sucesso!', 'success');
    }
}

// Funções de gerenciamento de variáveis
function processVariables(message, contact) {
    let processedMessage = message;
    
    // Substituir variáveis padrão
    processedMessage = processedMessage.replace(/\{nome\}/g, contact.name || '');
    processedMessage = processedMessage.replace(/\{telefone\}/g, contact.phone || '');
    
    // Substituir variáveis personalizadas
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        processedMessage = processedMessage.replace(regex, value);
    }
    
    // Substituir variáveis do contato
    if (contact.variables) {
        for (const [key, value] of Object.entries(contact.variables)) {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            processedMessage = processedMessage.replace(regex, value);
        }
    }
    
    return processedMessage;
}

function updateVariables(contactVariables) {
    variables = { ...variables, ...contactVariables };
    localStorage.setItem('variables', JSON.stringify(variables));
}

// Função para adicionar mensagem ao histórico
function addMessageToHistory(content, type, timestamp = Date.now()) {
    conversationHistory.push({
        content,
        type,
        timestamp
    });
    
    // Limitar histórico a 10 mensagens
    if (conversationHistory.length > 10) {
        conversationHistory.shift();
    }
    
    updateChatDisplay();
}

// Função para atualizar a exibição do chat
function updateChatDisplay() {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.innerHTML = '';
    
    conversationHistory.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.type === 'client' ? 'client-message' : 'assistant-message'}`;
        
        // Adicionar efeito de digitação para mensagens do assistente
        if (msg.type === 'assistant') {
            messageDiv.classList.add('typing-effect');
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${msg.content}
            </div>
            <div class="message-time">
                ${new Date(msg.timestamp).toLocaleTimeString()}
            </div>
        `;
        
        chatContainer.appendChild(messageDiv);
    });
    
    // Rolar para a última mensagem
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Função para enviar mensagem
async function sendMessage(message) {
    if (!message.trim()) return;
    
    // Adicionar mensagem do cliente ao histórico
    addMessageToHistory(message, 'client');
    
    try {
        // Mostrar indicador de digitação
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        document.getElementById('chatContainer').appendChild(typingIndicator);
        
        const response = await fetch('http://localhost:8000/generate-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('gptApiKey')}`
            },
            body: JSON.stringify({
                prompt: message,
                context: currentContext,
                previous_messages: conversationHistory
            })
        });
        
        if (!response.ok) throw new Error('Erro ao gerar resposta');
        
        const data = await response.json();
        
        // Remover indicador de digitação
        typingIndicator.remove();
        
        // Adicionar resposta ao histórico
        addMessageToHistory(data.message, 'assistant', data.timestamp * 1000);
        
        // Atualizar contexto
        currentContext = {
            ...currentContext,
            ...data.context,
            last_interaction: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Erro:', error);
        addMessageToHistory('Desculpe, tive um problema ao processar sua mensagem. Poderia tentar novamente?', 'assistant');
    }
}

// Event Listeners
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = e.target.value.trim();
        if (message) {
            sendMessage(message);
            e.target.value = '';
        }
    }
});

document.getElementById('sendButton').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message) {
        sendMessage(message);
        messageInput.value = '';
    }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Carregar histórico salvo se existir
    const savedHistory = localStorage.getItem('conversationHistory');
    if (savedHistory) {
        conversationHistory = JSON.parse(savedHistory);
        updateChatDisplay();
    }
    
    // Salvar histórico periodicamente
    setInterval(() => {
        localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
    }, 5000);
    
    updateTemplatesList();
}); 