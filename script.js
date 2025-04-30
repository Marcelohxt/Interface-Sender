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