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
import { MedicalDisclaimerBanner } from '../../components/MedicalDisclaimerBanner';
import { api } from '../../services/api';
import { ChatMessage } from '../../constants/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-0',
    sender: 'assistant',
    text:
      'Hello! I am your BloodBridge Clinical AI Assistant, powered by Groq LLM and our verified RAG medical knowledge base. Ask me about blood donation eligibility, clinical cross-matching protocols, 90-day cooldown rules, or how to create emergency requests.',
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
  const insets = useSafeAreaInsets();
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
          'Clinical AI service is temporarily offline. Clinical guideline: Whole blood donation requires a 90-day cooldown, and final transfusion cross-matching must be performed by certified blood bank pathologists.',
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
    >
      <Header
        title="Clinical AI Assistant"
        subtitle="Groq Llama-3 & Grounded RAG Corpus"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerBadge}>
            <Ionicons name="sparkles" size={14} color="#D71935" />
            <Text style={styles.headerBadgeText}>AI Active</Text>
          </View>
        }
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <MedicalDisclaimerBanner />

        {/* Quick Question Pills */}
        <View style={styles.faqSection}>
          <Text style={styles.faqLabel}>QUICK CLINICAL TOPICS:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {FAQ_CHIPS.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chip}
                activeOpacity={0.8}
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

                {/* Grounded RAG Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <View style={styles.sourcesContainer}>
                    <Text style={styles.sourcesTitle}>VERIFIED CLINICAL SOURCES:</Text>
                    {msg.sources.map((s, i) => (
                      <View key={i} style={styles.sourcePill}>
                        <Ionicons name="checkmark-circle" size={12} color={THEME.colors.success} />
                        <Text style={styles.sourceText} numberOfLines={1}>{s}</Text>
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
              <Text style={styles.typingText}>Consulting Verified Medical Corpus...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Field */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          placeholder="Ask clinical question (e.g. eligibility, cooldown)..."
          placeholderTextColor={THEME.colors.slate400}
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
    backgroundColor: THEME.colors.slate50
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  faqSection: {
    marginBottom: 16
  },
  faqLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.slate500,
    letterSpacing: 0.5,
    marginBottom: 8
  },
  chipsRow: {
    gap: 6
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...THEME.shadows.sm
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.slate700
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 14
  },
  bubbleRowUser: {
    justifyContent: 'flex-end'
  },
  bubbleRowAssistant: {
    justifyContent: 'flex-start'
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    padding: 14,
    ...THEME.shadows.sm
  },
  bubbleUser: {
    backgroundColor: THEME.colors.primary,
    borderBottomRightRadius: 4
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderBottomLeftRadius: 4
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21
  },
  bubbleTextUser: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  bubbleTextAssistant: {
    color: THEME.colors.navy,
    fontWeight: '500'
  },
  sourcesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.slate100
  },
  sourcesTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginBottom: 4,
    letterSpacing: 0.5
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2
  },
  sourceText: {
    fontSize: 11,
    color: THEME.colors.slate600,
    fontWeight: '500'
  },
  timeText: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end'
  },
  timeTextUser: {
    color: 'rgba(255,255,255,0.75)'
  },
  timeTextAssistant: {
    color: THEME.colors.slate400
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12
  },
  typingText: {
    fontSize: 12,
    color: THEME.colors.slate500,
    fontStyle: 'italic'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingHorizontal: 12,
    paddingTop: 10
  },
  textInput: {
    flex: 1,
    height: 46,
    backgroundColor: THEME.colors.slate100,
    borderRadius: 23,
    paddingHorizontal: 16,
    fontSize: 14,
    color: THEME.colors.navy,
    marginRight: 8,
    fontWeight: '500'
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.sm
  },
  sendBtnDisabled: {
    opacity: 0.4
  }
});
