'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useClinicStore } from '@/lib/store';
import {
  MessageCircle,
  Search,
  Send,
  User,
  Check,
  CheckCheck,
  QrCode,
  Smartphone,
  Info,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { MensajeLog } from '@/lib/types';

export default function WhatsappCRMPage() {
  const { 
    cajaSesionActiva, 
    sedes, 
    setSedeWhatsappConnected,
    mensajesGlobales,
    enviarMensajeChat
  } = useClinicStore();

  const sedeId = cajaSesionActiva?.sedeId;
  const currentSede = sedes.find(s => s.id === sedeId);
  const isConnected = currentSede?.whatsappConectado || false;

  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSimulatingQR, setIsSimulatingQR] = useState(false);

  // Group messages by phone number
  const conversations = useMemo(() => {
    if (!sedeId) return [];
    
    // In a real app, we'd filter messages by sedeId. For now, we show global messages.
    // Grouping by telefono
    const groups: Record<string, MensajeLog[]> = {};
    
    mensajesGlobales.forEach(msg => {
      if (!groups[msg.pacienteTelefono]) {
        groups[msg.pacienteTelefono] = [];
      }
      groups[msg.pacienteTelefono].push(msg);
    });

    // Convert to array and sort by latest message
    const result = Object.entries(groups).map(([telefono, messages]) => {
      const sorted = messages.sort((a, b) => new Date(a.fechaEnvio).getTime() - new Date(b.fechaEnvio).getTime());
      const lastMessage = sorted[sorted.length - 1];
      return {
        telefono,
        nombre: lastMessage.pacienteNombre,
        lastMessage,
        messages: sorted
      };
    });

    return result.sort((a, b) => new Date(b.lastMessage.fechaEnvio).getTime() - new Date(a.lastMessage.fechaEnvio).getTime());
  }, [mensajesGlobales, sedeId]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => 
      c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.telefono.includes(searchQuery)
    );
  }, [conversations, searchQuery]);

  const activeConversation = useMemo(() => {
    return conversations.find(c => c.telefono === activeContact) || null;
  }, [conversations, activeContact]);

  // Handler for connecting WhatsApp
  const handleConnect = () => {
    setIsSimulatingQR(true);
    setTimeout(() => {
      if (sedeId) {
        setSedeWhatsappConnected(sedeId, true);
      }
      setIsSimulatingQR(false);
    }, 2000);
  };

  const handleDisconnect = () => {
    if (sedeId) {
      setSedeWhatsappConnected(sedeId, false);
      setActiveContact(null);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !activeContact || !sedeId) return;

    const contactName = activeConversation?.nombre || 'Paciente';
    
    enviarMensajeChat(
      sedeId,
      contactName,
      activeContact,
      messageText,
      'saliente'
    );
    
    setMessageText('');

    // Simulate auto-reply after 2 seconds
    setTimeout(() => {
      enviarMensajeChat(
        sedeId,
        contactName,
        activeContact,
        '¡Hola! Gracias por comunicarte con nosotros. Un asesor te responderá pronto. (Mensaje simulado)',
        'entrante'
      );
    }, 2000);
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    const chatContainer = document.getElementById('chat-scroll-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [activeConversation?.messages.length]);

  if (!cajaSesionActiva || cajaSesionActiva.estado === 'cerrada') {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-card border border-border p-8 rounded-2xl max-w-md text-center">
          <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Caja Cerrada</h2>
          <p className="text-muted-foreground">
            Debes abrir una caja (sesión) para poder gestionar el WhatsApp de esta Sede.
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center p-6 bg-[#0b141a]">
        <div className="bg-[#111b21] border border-border/10 p-10 rounded-2xl max-w-3xl w-full flex flex-col md:flex-row items-center gap-10 shadow-2xl">
          <div className="flex-1 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <MessageCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-3xl font-light">WhatsApp Web CRM</h2>
            </div>
            
            <p className="text-gray-400 mb-8 text-lg">
              Usa WhatsApp en tu óptica sincronizando tu teléfono.
            </p>
            
            <ol className="space-y-4 text-gray-300 font-medium">
              <li className="flex gap-3">
                <span className="text-gray-500">1.</span> Abre WhatsApp en tu teléfono
              </li>
              <li className="flex gap-3">
                <span className="text-gray-500">2.</span> Toca Menú o Configuración y selecciona Dispositivos vinculados
              </li>
              <li className="flex gap-3">
                <span className="text-gray-500">3.</span> Toca Vincular un dispositivo
              </li>
              <li className="flex gap-3">
                <span className="text-gray-500">4.</span> Apunta tu teléfono a esta pantalla para escanear el código
              </li>
            </ol>
          </div>
          
          <div className="bg-white p-4 rounded-2xl flex-shrink-0 relative overflow-hidden">
            <div className={cn("transition-opacity duration-300", isSimulatingQR ? "opacity-30 blur-sm" : "opacity-100")}>
              <QrCode className="w-64 h-64 text-black" strokeWidth={1} />
            </div>
            
            <AnimatePresence>
              {isSimulatingQR && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <span className="text-black font-semibold">Conectando...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Temporary auto-connect button for testing */}
        <button 
          onClick={handleConnect}
          className="fixed bottom-6 right-6 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-colors"
          disabled={isSimulatingQR}
        >
          {isSimulatingQR ? 'Conectando...' : 'Simular Escaneo QR'}
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex rounded-2xl overflow-hidden border border-border shadow-lg bg-card">
      {/* Sidebar - Contacts */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-border flex flex-col bg-muted/20">
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm">Sede Conectada</div>
              <div className="text-xs text-green-500 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                En línea
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 border-b border-border bg-card">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Busca un chat o paciente..."
              className="w-full bg-muted border-none rounded-lg py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
              <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">No hay conversaciones activas.</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeContact === conv.telefono;
              const isOutgoing = conv.lastMessage.direccion === 'saliente';
              return (
                <button
                  key={conv.telefono}
                  onClick={() => setActiveContact(conv.telefono)}
                  className={cn(
                    "w-full p-4 border-b border-border/50 flex items-start gap-3 transition-colors text-left hover:bg-muted/50",
                    isSelected && "bg-muted hover:bg-muted"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm truncate">{conv.nombre}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(conv.lastMessage.fechaEnvio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {isOutgoing && (
                        <CheckCheck className={cn("w-3 h-3", conv.lastMessage.estado === 'leido' ? "text-blue-500" : "text-muted-foreground")} />
                      )}
                      <span className="truncate">{conv.lastMessage.mensajeText}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_DckOUM5a.png')] bg-repeat",
        !activeContact && "hidden md:flex" // Hide on mobile if no contact selected
      )}>
        {activeContact && activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border bg-card flex items-center px-6 shadow-sm z-10 flex-shrink-0">
              <button 
                className="md:hidden mr-4 text-muted-foreground hover:text-foreground"
                onClick={() => setActiveContact(null)}
              >
                ← Volver
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{activeConversation.nombre}</h3>
                <p className="text-xs text-muted-foreground">{activeConversation.telefono}</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div id="chat-scroll-container" className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {activeConversation.messages.map((msg, idx) => {
                const isOutgoing = msg.direccion === 'saliente';
                
                return (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex flex-col max-w-[75%]",
                      isOutgoing ? "self-end items-end" : "self-start items-start"
                    )}
                  >
                    {/* Optional Context/Detalle Adicional tag */}
                    {msg.detalleAdicional && (
                      <div className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary mb-1 inline-block">
                        {msg.detalleAdicional}
                      </div>
                    )}
                    
                    <div className={cn(
                      "px-4 py-2 rounded-2xl relative shadow-sm",
                      isOutgoing 
                        ? "bg-[#005c4b] text-white rounded-tr-none" 
                        : "bg-[#202c33] text-white rounded-tl-none border border-border/20"
                    )}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.mensajeText}</p>
                      
                      <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                        <span className="text-[10px]">
                          {new Date(msg.fechaEnvio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOutgoing && (
                          <CheckCheck className={cn("w-3 h-3", msg.estado === 'leido' ? "text-blue-400" : "")} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input */}
            <form 
              onSubmit={handleSendMessage}
              className="p-4 bg-card border-t border-border flex items-end gap-3 flex-shrink-0"
            >
              <div className="flex-1 relative">
                <textarea
                  className="w-full bg-muted border border-border/50 rounded-2xl py-3 px-4 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none max-h-32 min-h-[44px]"
                  placeholder="Escribe un mensaje..."
                  rows={1}
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-105 active:scale-95"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-32 h-32 mb-8 opacity-20">
              <MessageCircle className="w-full h-full text-foreground" />
            </div>
            <h2 className="text-2xl font-light mb-4">OptiSaaS WhatsApp CRM</h2>
            <p className="text-muted-foreground max-w-md">
              Envía y recibe mensajes sin salir de la plataforma. Selecciona un chat de la lista izquierda para comenzar o utiliza la barra de búsqueda para encontrar a un paciente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
