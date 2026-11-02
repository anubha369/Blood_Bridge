import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';
import { api } from '../../services/api';
import { ChatMessage } from '../../constants/types';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-0',
    sender: 'assistant',
    text:
      'Hello! I am your BloodBridge Clinical AI Assistant, powered by Groq LLM and our medical RAG knowledge base. Ask me about blood donation eligibility, clinical cross-matching protocols, cooldown rules, or how to create emergency requests.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    grounded: true,
    sources: ['BloodBridge Medical Eligibility Guidelines (NBTC/WHO)']
  }
];

const FAQ_CHIPS = [
  'How often can I donate blood?',
  'Can I donate with a tattoo?',
  'Why is O-negative universal?',
  'How do I create a blood request?'
];

export const AIAssistantScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const question = (textToSend || input).trim();
    if (!question || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history for API
      const history = messages.slice(-4).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await api.ai.askAssistant(question, history);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.answer || res.response || 'I am here to coordinate blood availability questions.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        grounded: res.grounded !== false,
        sources: Array.isArray(res.rag_sources)
          ? res.rag_sources.map((s: any) => (typeof s === 'string' ? s : s.title || s.source))
          : undefined
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text:
          'Our AI service is momentarily unavailable. BloodBridge clinical rule: Whole blood donation requires a 90-day cooldown, and clinical cross-matching must be verified at authorized medical centers.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Header
        title="BloodBridge AI Assistant"
        subtitle="Groq Intelligence & Clinical RAG"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MedicalDisclaimerBanner />

        {/* Quick Question Pills */}
        <View style={styles.faqSection}>
          <Text style={styles.faqLabel}>Frequently Asked Clinical Questions:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {FAQ_CHIPS.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chip}
                onPress={() => handleSend(chip)}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Message Thread */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <View
              key={msg.id}
              style={[
                styles.bubbleRow,
                isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant
              ]}
            >
              {!isUser && (
                <View style={styles.avatarCircle}>
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleAssistant
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant
                  ]}
                >
                  {msg.text}
                </Text>

                {/* RAG Source References */}
                {msg.sources && msg.sources.length > 0 && (
                  <View style={styles.sourcesContainer}>
                    <Text style={styles.sourcesTitle}>Grounded RAG Sources:</Text>
                    {msg.sources.map((src, sIdx) => (
                      <View key={sIdx} style={styles.sourcePill}>
                        <Ionicons name="document-text-outline" size={12} color={THEME.colors.primary} />
                        <Text style={styles.sourceText} numberOfLines={1}>
                          {src}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text
                  style={[
                    styles.timeText,
                    isUser ? styles.timeTextUser : styles.timeTextAssistant
                  ]}
                >
                  {msg.timestamp}
                </Text>
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
            <View style={styles.avatarCircle}>
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
            </View>
            <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
              <ActivityIndicator size="small" color={THEME.colors.primary} />
              <Text style={styles.typingText}>Consulting Medical RAG Corpus...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Field */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Ask about blood groups, donation eligibility..."
          placeholderTextColor={THEME.colors.textLight}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSend()}
          style={styles.textInput}
        />
        <TouchableOpacity
          onPress={() => handleSend()}
          disabled={!input.trim() || loading}
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
        >
          <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  scrollContent: {
    padding: THEME.spacing.base,
    paddingBottom: 20
  },
  faqSection: {
    marginBottom: 14
  },
  faqLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 6
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 6
  },
  chip: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.round,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.navy
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  bubbleRowUser: {
    justifyContent: 'flex-end'
  },
  bubbleRowAssistant: {
    justifyContent: 'flex-start'
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: THEME.borderRadius.lg,
    padding: 12,
    ...THEME.shadows.sm
  },
  bubbleUser: {
    backgroundColor: THEME.colors.primary,
    borderBottomRightRadius: 2
  },
  bubbleAssistant: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    borderBottomLeftRadius: 2
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20
  },
  bubbleTextUser: {
    color: '#FFFFFF',
    fontWeight: '500'
  },
  bubbleTextAssistant: {
    color: THEME.colors.text
  },
  sourcesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight
  },
  sourcesTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  sourceText: {
    fontSize: 11,
    color: THEME.colors.textMuted
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end'
  },
  timeTextUser: {
    color: 'rgba(255,255,255,0.7)'
  },
  timeTextAssistant: {
    color: THEME.colors.textLight
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10
  },
  typingText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontStyle: 'italic'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: THEME.borderRadius.round,
    paddingHorizontal: 16,
    fontSize: 14,
    color: THEME.colors.navy,
    marginRight: 8
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.emergency
  },
  sendBtnDisabled: {
    opacity: 0.4
  }
});
