from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
import requests
import tempfile
import re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import random

app = Flask(__name__)
CORS(app)
load_dotenv()

# Configurações
UPLOAD_FOLDER = 'uploads'
TEMPLATES_FOLDER = 'templates'
ACCOUNTS_FILE = 'accounts.json'

# Criar pastas necessárias
for folder in [UPLOAD_FOLDER, TEMPLATES_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

# Carregar ou criar arquivo de contas
if not os.path.exists(ACCOUNTS_FILE):
    with open(ACCOUNTS_FILE, 'w') as f:
        json.dump({"accounts": []}, f)

class WhatsAppBot:
    def __init__(self):
        self.driver = None
        
    def initialize(self):
        chrome_options = Options()
        chrome_options.add_argument("--user-data-dir=./chrome_profile")
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.get("https://web.whatsapp.com")
        return self.wait_for_login()
    
    def wait_for_login(self):
        try:
            WebDriverWait(self.driver, 60).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '._3Qnsr'))
            )
            return True
        except:
            return False
    
    def send_message(self, number, message, media_paths=None):
        try:
            # Formatar número
            number = re.sub(r'[^0-9]', '', number)
            
            # Abrir chat
            self.driver.get(f"https://web.whatsapp.com/send?phone={number}")
            
            # Esperar carregar
            message_box = WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '._3Uu1_'))
            )
            
            # Enviar mídia se houver
            if media_paths:
                for media in media_paths:
                    attachment = self.driver.find_element(By.CSS_SELECTOR, '._1OT67')
                    attachment.click()
                    time.sleep(1)
                    
                    # Enviar arquivo
                    input_file = self.driver.find_element(By.CSS_SELECTOR, 'input[type="file"]')
                    input_file.send_keys(media)
                    time.sleep(2)
                    
                    # Enviar
                    send_btn = self.driver.find_element(By.CSS_SELECTOR, '._3wFFT')
                    send_btn.click()
                    time.sleep(1)
            
            # Enviar mensagem
            message_box.send_keys(message)
            send_button = self.driver.find_element(By.CSS_SELECTOR, '._3qx7_')
            send_button.click()
            
            time.sleep(random.uniform(1.5, 3.0))  # Intervalo aleatório
            return True
            
        except Exception as e:
            print(f"Erro ao enviar mensagem: {str(e)}")
            return False

# Instância global do bot
whatsapp_bot = None

@app.route('/')
def home():
    return jsonify({
        'status': 'online',
        'message': 'WhatsApp Sender API está funcionando!',
        'endpoints': {
            '/send': 'POST - Enviar mensagem com mídia opcional',
            '/generate-message': 'POST - Gerar mensagem com GPT',
            '/validate-numbers': 'POST - Validar números WhatsApp',
            '/templates': 'GET/POST - Gerenciar templates',
            '/accounts': 'GET/POST - Gerenciar contas',
            '/grab-group-contacts': 'POST - Capturar contatos de grupo'
        }
    })

@app.route('/initialize', methods=['POST'])
def initialize_bot():
    global whatsapp_bot
    try:
        whatsapp_bot = WhatsAppBot()
        success = whatsapp_bot.initialize()
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/send', methods=['POST'])
def send_message():
    try:
        number = request.form.get('number')
        message = request.form.get('message')
        media_files = request.files.getlist('media')

        if not number or not message:
            return jsonify({'error': 'Número e mensagem são obrigatórios'}), 400

        # Processar tags personalizadas
        tags = json.loads(request.form.get('tags', '{}'))
        for tag, value in tags.items():
            message = message.replace(f"{{{{{tag}}}}}", value)

        # Salvar arquivos de mídia temporariamente
        media_paths = []
        for media in media_files:
            if media.filename:
                temp_path = os.path.join(UPLOAD_FOLDER, media.filename)
                media.save(temp_path)
                media_paths.append(os.path.abspath(temp_path))

        # Enviar mensagem
        if whatsapp_bot:
            success = whatsapp_bot.send_message(number, message, media_paths)
        else:
            return jsonify({'error': 'WhatsApp bot não inicializado'}), 400

        # Limpar arquivos temporários
        for path in media_paths:
            try:
                os.remove(path)
            except:
                pass

        return jsonify({
            'status': 'success' if success else 'error',
            'message': 'Mensagem enviada com sucesso' if success else 'Erro ao enviar mensagem',
            'number': number
        }), 200 if success else 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/validate-numbers', methods=['POST'])
def validate_numbers():
    try:
        numbers = request.json.get('numbers', [])
        validated = []
        
        for number in numbers:
            # Limpar número
            clean_number = re.sub(r'[^0-9]', '', number)
            
            # Validar formato
            is_valid = len(clean_number) >= 10 and len(clean_number) <= 14
            
            validated.append({
                'original': number,
                'cleaned': clean_number,
                'valid': is_valid
            })
        
        return jsonify({'numbers': validated})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/templates', methods=['GET', 'POST'])
def manage_templates():
    if request.method == 'GET':
        templates = []
        for filename in os.listdir(TEMPLATES_FOLDER):
            if filename.endswith('.json'):
                with open(os.path.join(TEMPLATES_FOLDER, filename)) as f:
                    templates.append(json.load(f))
        return jsonify({'templates': templates})
    
    elif request.method == 'POST':
        try:
            template = request.json
            filename = f"{template['name'].lower().replace(' ', '_')}.json"
            with open(os.path.join(TEMPLATES_FOLDER, filename), 'w') as f:
                json.dump(template, f)
            return jsonify({'message': 'Template salvo com sucesso'})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/accounts', methods=['GET', 'POST'])
def manage_accounts():
    if request.method == 'GET':
        with open(ACCOUNTS_FILE) as f:
            return jsonify(json.load(f))
    
    elif request.method == 'POST':
        try:
            account = request.json
            with open(ACCOUNTS_FILE) as f:
                data = json.load(f)
            data['accounts'].append(account)
            with open(ACCOUNTS_FILE, 'w') as f:
                json.dump(data, f)
            return jsonify({'message': 'Conta adicionada com sucesso'})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/generate-message', methods=['POST'])
def generate_message():
    try:
        data = request.get_json()
        prompt = data.get('prompt')
        api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        context = data.get('context', {})  # Contexto da conversa
        previous_messages = data.get('previous_messages', [])  # Histórico de mensagens

        if not prompt or not api_key:
            return jsonify({'error': 'Prompt e API key são obrigatórios'}), 400

        # Construir o contexto da conversa
        conversation_context = [
            {
                'role': 'system',
                'content': '''Você é um atendente humano muito amigável e profissional. 
                Seu objetivo é ajudar os clientes de forma natural e conversacional.
                Use linguagem coloquial quando apropriado, mas mantenha o profissionalismo.
                Inclua expressões comuns do dia a dia como "tudo bem?", "entendi", "claro", etc.
                Seja empático e mostre que você realmente se importa com o cliente.
                Use emojis ocasionalmente para tornar a conversa mais amigável.
                Mantenha um tom caloroso e acolhedor.
                Evite respostas muito longas ou formais.
                Seja direto e objetivo, mas sempre mantendo a cordialidade.'''
            }
        ]

        # Adicionar histórico de mensagens se houver
        for msg in previous_messages:
            conversation_context.append({
                'role': 'user' if msg['type'] == 'client' else 'assistant',
                'content': msg['content']
            })

        # Adicionar o contexto atual
        if context:
            conversation_context.append({
                'role': 'system',
                'content': f'''Contexto atual:
                - Nome do cliente: {context.get('client_name', 'Cliente')}
                - Assunto: {context.get('subject', 'Não especificado')}
                - Estado emocional: {context.get('mood', 'Neutro')}
                - Última interação: {context.get('last_interaction', 'Nenhuma')}'''
            })

        # Adicionar a mensagem atual
        conversation_context.append({
            'role': 'user',
            'content': prompt
        })

        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-3.5-turbo',
                'messages': conversation_context,
                'temperature': 0.7,  # Aumentar para tornar as respostas mais variadas
                'top_p': 0.9,
                'frequency_penalty': 0.5,  # Reduzir repetições
                'presence_penalty': 0.5  # Incentivar variedade de tópicos
            }
        )

        if response.status_code != 200:
            return jsonify({'error': 'Erro ao gerar mensagem com GPT'}), 500

        message = response.json()['choices'][0]['message']['content']
        
        # Adicionar pequenos atrasos aleatórios para simular digitação humana
        time.sleep(random.uniform(1.0, 2.5))
        
        return jsonify({
            'message': message,
            'context': context,
            'timestamp': time.time()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint não encontrado'}), 404

if __name__ == '__main__':
    app.run(debug=True, port=8000) 