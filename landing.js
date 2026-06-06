// ==========================================
// OPTISAAS LANDING CONTROLLER
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    // ------------------------------------------
    // 1. THEME SWITCHER (DARK/LIGHT MODE)
    // ------------------------------------------
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    // Check saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
    
    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    // ------------------------------------------
    // 2. INTERACTIVE DEMO CONTROLLER
    // ------------------------------------------
    const steps = [
        { id: 1, title: 'Registro y Agenda', template: 'temp-step-1' },
        { id: 2, title: 'Consulta de Optometría', template: 'temp-step-2' },
        { id: 3, title: 'Venta y Selección POS', template: 'temp-step-3' },
        { id: 4, title: 'Facturación Electrónica', template: 'temp-step-4' },
        { id: 5, title: 'Laboratorio y Montaje', template: 'temp-step-5' },
        { id: 6, title: 'Control Secretaría de Salud', template: 'temp-step-6' },
        { id: 7, title: 'Entrega y Firma Digital', template: 'temp-step-7' }
    ];
    
    let currentStepIndex = 0; // 0-indexed (maps to step 1)
    
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    const stepIndicator = document.getElementById('step-indicator');
    const screenContent = document.getElementById('demo-screen-content');
    const progressFill = document.getElementById('progress-fill');
    const stepNodes = document.querySelectorAll('.step-node');
    
    // Initialize first step
    renderStep(0);
    
    // Button Event Listeners
    prevBtn.addEventListener('click', () => {
        if (currentStepIndex > 0) {
            currentStepIndex--;
            renderStep(currentStepIndex);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentStepIndex < steps.length - 1) {
            currentStepIndex++;
            renderStep(currentStepIndex);
        }
    });
    
    // Clickable nodes on the timeline
    stepNodes.forEach(node => {
        node.addEventListener('click', () => {
            const stepNum = parseInt(node.getAttribute('data-step'), 10);
            currentStepIndex = stepNum - 1;
            renderStep(currentStepIndex);
        });
    });
    
    function renderStep(index) {
        const step = steps[index];
        
        // 1. Update Timeline active/passed states
        stepNodes.forEach((node, nodeIdx) => {
            node.classList.remove('active', 'passed');
            if (nodeIdx === index) {
                node.classList.add('active');
            } else if (nodeIdx < index) {
                node.classList.add('passed');
            }
        });
        
        // 2. Update Progress Line Fill Percentage
        const fillPercentage = (index / (steps.length - 1)) * 100;
        progressFill.style.width = `${fillPercentage}%`;
        
        // 3. Clear and render new screen from template
        screenContent.innerHTML = '';
        const template = document.getElementById(step.template);
        if (template) {
            const clone = template.content.cloneNode(true);
            screenContent.appendChild(clone);
        }
        
        // 4. Update Controller Labels & Button States
        stepIndicator.textContent = `Paso ${step.id} de 7: ${step.title}`;
        prevBtn.disabled = index === 0;
        nextBtn.textContent = index === steps.length - 1 ? 'Finalizar Tour 🎉' : 'Siguiente →';
        
        // Custom interactions for specific steps if clicked within mock screens
        setupMockInteractions(step.id);
    }
    
    // Add micro-interactions inside the mock screens to make them feel alive
    function setupMockInteractions(stepId) {
        // Step 4: Toggle payment options
        if (stepId === 4) {
            const options = screenContent.querySelectorAll('.saas-pay-option');
            options.forEach(opt => {
                opt.addEventListener('click', () => {
                    options.forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                });
            });
        }
    }

    // ------------------------------------------
    // 3. BENTO CARD & GLOW SPOTLIGHT HOVER EFFECTS
    // ------------------------------------------
    const glowCards = document.querySelectorAll('.card-glow');
    
    glowCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--x', `${x}px`);
            card.style.setProperty('--y', `${y}px`);
        });
    });
});
