// Gerenciamento de Templates
class TemplateManager {
    constructor() {
        this.templates = JSON.parse(localStorage.getItem('templates') || '[]');
        this.setupEventListeners();
        this.displayTemplates();
    }

    setupEventListeners() {
        // Submissão do formulário de template
        document.getElementById('templateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTemplate();
        });

        // Submissão do formulário de mensagem
        document.getElementById('messageForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.prepareMessage();
        });

        // Mudança na seleção do template
        document.getElementById('templateSelect').addEventListener('change', () => {
            this.handleTemplateSelection();
        });

        // Botão de adicionar variável
        document.getElementById('addVariable').addEventListener('click', () => {
            this.addVariableField();
        });
    }

    addTemplate() {
        const name = document.getElementById('templateName').value;
        const content = document.getElementById('templateContent').value;
        
        if (!name || !content) {
            alert('Por favor, preencha todos os campos');
            return;
        }

        const template = {
            id: Date.now(),
            name,
            content,
            variables: this.extractVariables(content)
        };

        this.templates.push(template);
        this.saveTemplates();
        this.displayTemplates();
        
        // Limpar formulário e fechar modal
        document.getElementById('templateForm').reset();
        bootstrap.Modal.getInstance(document.getElementById('addTemplateModal')).hide();
    }

    deleteTemplate(id) {
        if (confirm('Tem certeza que deseja excluir este template?')) {
            this.templates = this.templates.filter(t => t.id !== id);
            this.saveTemplates();
            this.displayTemplates();
        }
    }

    displayTemplates() {
        const templateList = document.getElementById('templateList');
        const templateSelect = document.getElementById('templateSelect');
        
        // Limpar templates existentes
        templateList.innerHTML = '';
        templateSelect.innerHTML = '<option value="">Selecione um template</option>';

        this.templates.forEach(template => {
            // Adicionar à lista de templates
            const li = document.createElement('div');
            li.className = 'list-group-item';
            li.innerHTML = `
                <span>${template.name}</span>
                <div class="template-actions">
                    <button class="btn btn-sm btn-danger" onclick="templateManager.deleteTemplate(${template.id})">
                        Excluir
                    </button>
                </div>
            `;
            templateList.appendChild(li);

            // Adicionar ao select de templates
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            templateSelect.appendChild(option);
        });
    }

    saveTemplates() {
        localStorage.setItem('templates', JSON.stringify(this.templates));
    }

    // Gerenciamento de Variáveis
    extractVariables(content) {
        const regex = /\{([^}]+)\}/g;
        const variables = new Set();
        let match;
        
        while ((match = regex.exec(content)) !== null) {
            variables.add(match[1]);
        }

        return Array.from(variables);
    }

    addVariableField() {
        const container = document.getElementById('variableFields');
        const field = document.createElement('div');
        field.className = 'variable-field';
        field.innerHTML = `
            <input type="text" class="form-control" placeholder="Nome da variável" name="varName[]">
            <input type="text" class="form-control" placeholder="Valor" name="varValue[]">
            <button type="button" class="btn btn-danger btn-remove-variable">Remover</button>
        `;

        field.querySelector('.btn-remove-variable').addEventListener('click', () => {
            field.remove();
        });

        container.appendChild(field);
    }

    handleTemplateSelection() {
        const templateId = document.getElementById('templateSelect').value;
        const variableFields = document.getElementById('variableFields');
        variableFields.innerHTML = '';

        if (!templateId) return;

        const template = this.templates.find(t => t.id === parseInt(templateId));
        if (!template) return;

        template.variables.forEach(variable => {
            const field = document.createElement('div');
            field.className = 'variable-field';
            field.innerHTML = `
                <input type="text" class="form-control" value="${variable}" readonly name="varName[]">
                <input type="text" class="form-control" placeholder="Valor" name="varValue[]">
                <button type="button" class="btn btn-danger btn-remove-variable" disabled>Remover</button>
            `;
            variableFields.appendChild(field);
        });
    }

    // Preparação de Mensagem
    prepareMessage() {
        const phoneNumber = this.formatPhoneNumber(document.getElementById('phoneNumber').value);
        if (!phoneNumber) {
            alert('Por favor, insira um número de telefone válido');
            return;
        }

        const templateId = document.getElementById('templateSelect').value;
        if (!templateId) {
            alert('Por favor, selecione um template');
            return;
        }

        const template = this.templates.find(t => t.id === parseInt(templateId));
        if (!template) return;

        let message = template.content;
        const varNames = document.getElementsByName('varName[]');
        const varValues = document.getElementsByName('varValue[]');

        for (let i = 0; i < varNames.length; i++) {
            const name = varNames[i].value;
            const value = varValues[i].value;
            if (!value) {
                alert(`Por favor, preencha todos os valores das variáveis`);
                return;
            }
            message = message.replace(`{${name}}`, value);
        }

        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    formatPhoneNumber(phone) {
        // Remover todos os caracteres não numéricos
        const cleaned = phone.replace(/\D/g, '');
        
        // Verificar se é um número válido (mínimo 10 dígitos)
        if (cleaned.length < 10) return null;

        // Se o número não começar com código do país, adicionar código do Brasil (55)
        return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    }
}

// Inicializar gerenciador de templates quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.templateManager = new TemplateManager();
}); 




// ================================================
                                               
// Efeito Matrix

function initMatrix() {
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');
  
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  
    const letters = 'LILITHEONOAHGHIJKLMNLILITHEONOAHABCDEFGHIJKLMNLILITHEONOAHABCDEFGHIJKLMNLILITHEONOAHABCDEFGHIJKLMNLILITHEONOAH'.split('');
    const fontSize = 20;
    const columns = canvas.width / fontSize;
    const drops = [];
  
    for (let i = 0; i < columns; i++) {
        drops[i] = 1;
    }
  
    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
  
        ctx.fillStyle = '#0F0';
        ctx.font = fontSize + 'px monospace';
  
        for (let i = 0; i < drops.length; i++) {
            const text = letters[Math.floor(Math.random() * letters.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
  
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
  
            drops[i]++;
        }
    }
  
    setInterval(draw, 70);
  
    // Ajusta o tamanho do canvas quando a janela é redimensionada
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
  }
  
  // Controle do Modo Noturno
  function initDarkMode() {
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');
    
    // Verifica se há preferência salva
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        icon.classList.replace('bi-moon-fill', 'bi-sun-fill');
    }
  
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        
        // Alterna o ícone
        if (isDark) {
            icon.classList.replace('bi-moon-fill', 'bi-sun-fill');
        } else {
            icon.classList.replace('bi-sun-fill', 'bi-moon-fill');
        }
        
        // Salva a preferência
        localStorage.setItem('darkMode', isDark);
    });
  }
  
  // Inicializa quando o documento estiver pronto
  document.addEventListener('DOMContentLoaded', () => {
    initMatrix();
    initDarkMode();
  });














  
// Configurações do WhatsApp
function initConfiguracao() {
    // Elementos do DOM
    const configModal = document.getElementById('configModal');
    const apiKeyInput = document.getElementById('apiKey');
    const toggleApiKey = document.getElementById('toggleApiKey');
    const saveConfig = document.getElementById('saveConfig');
    const delayEnvio = document.getElementById('delayEnvio');
    const maxTentativas = document.getElementById('maxTentativas');
    const temaClaro = document.getElementById('temaClaro');
    const temaEscuro = document.getElementById('temaEscuro');
    const notificacoes = document.getElementById('notificacoes');
    const assinatura = document.getElementById('assinatura');
    const confirmacaoLeitura = document.getElementById('confirmacaoLeitura');

    // Carregar configurações salvas
    function loadConfig() {
        apiKeyInput.value = localStorage.getItem('apiKey') || '';
        delayEnvio.value = localStorage.getItem('delayEnvio') || '10';
        maxTentativas.value = localStorage.getItem('maxTentativas') || '3';
        temaEscuro.checked = localStorage.getItem('temaEscuro') === 'true';
        temaClaro.checked = !temaEscuro.checked;
        notificacoes.checked = localStorage.getItem('notificacoes') === 'true';
        assinatura.value = localStorage.getItem('assinatura') || '';
        confirmacaoLeitura.checked = localStorage.getItem('confirmacaoLeitura') === 'true';

        // Aplicar tema
        document.body.classList.toggle('dark-mode', temaEscuro.checked);
    }

    // Salvar configurações
    function saveConfiguracoes() {
        localStorage.setItem('apiKey', apiKeyInput.value);
        localStorage.setItem('delayEnvio', delayEnvio.value);
        localStorage.setItem('maxTentativas', maxTentativas.value);
        localStorage.setItem('temaEscuro', temaEscuro.checked);
        localStorage.setItem('notificacoes', notificacoes.checked);
        localStorage.setItem('assinatura', assinatura.value);
        localStorage.setItem('confirmacaoLeitura', confirmacaoLeitura.checked);

        // Aplicar tema
        document.body.classList.toggle('dark-mode', temaEscuro.checked);

        // Mostrar feedback
        showToast('Configurações salvas com sucesso!', 'success');
    }

    // Toggle visibilidade da API Key
    toggleApiKey.addEventListener('click', () => {
        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;
        toggleApiKey.innerHTML = `<i class="bi bi-eye${type === 'password' ? '' : '-slash'}"></i>`;
    });

    // Salvar ao clicar no botão
    saveConfig.addEventListener('click', () => {
        saveConfiguracoes();
        bootstrap.Modal.getInstance(configModal).hide();
    });

    // Carregar configurações quando abrir o modal
    configModal.addEventListener('show.bs.modal', loadConfig);

    // Alternar tema
    temaClaro.addEventListener('change', () => {
        document.body.classList.remove('dark-mode');
    });

    temaEscuro.addEventListener('change', () => {
        document.body.classList.add('dark-mode');
    });
}

// Função para mostrar toast de feedback
function showToast(message, type = 'info') {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '1050';

    toastContainer.innerHTML = `
        <div class="toast align-items-center text-white bg-${type}" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    document.body.appendChild(toastContainer);
    const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'));
    toast.show();

    // Remover após fechar
    toastContainer.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toastContainer);
    });
}

// Inicializar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    initConfiguracao();
    // ... rest of the existing initialization code ...
});