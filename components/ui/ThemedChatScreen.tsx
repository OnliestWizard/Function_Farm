import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { makeCompanion } from "../companion/makeCompanion";
import { ThemeProvider, useTheme, Theme, makeTheme, Density, Mood, Language } from "./ThemeContext";
// Importing from locally defined modules.
import { CairnMark, PatternCard, MergeCard, DiffCard, ReceiptCard } from "./cards";
import { CompanionContext, ChatTurn, EvidenceKind } from "../companion/types";

const companion = makeCompanion();

interface Message {
  id: number;
  role: "you" | "cairn";
  lines: string[];
  evidence?: EvidenceKind;
  receipt?: any; // Place for integrating receipts, with any type for now
}

export default function ChatScreen() {
  const [mood, setMood] = useState<Mood>("warm");
  const [density, setDensity] = useState<Density>("regular");
  const [language, setLanguage] = useState<Language>("hybrid");
  const theme = useMemo(() => makeTheme(mood, density), [mood, density]);

  return (
    <ThemeProvider theme={theme}>
      <Chat
        theme={theme}
        language={language}
        mood={mood}
        density={density}
        setMood={setMood}
        setDensity={setDensity}
        setLanguage={setLanguage}
      />
    </ThemeProvider>
  );
}

function Chat(props: {
  theme: Theme;
  language: Language;
  mood: Mood;
  density: Density;
  setMood: (m: Mood) => void;
  setDensity: (d: Density) => void;
  setLanguage: (l: Language) => void;
}) {
  const { theme } = props;
  const c = theme.c;

  const [ctx, setCtx] = useState<CompanionContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const idRef = useRef(0);
  const acceptedRef = useRef(false);
  const nextId = () => idRef.current++;

  useEffect(() => {
    (async () => {
      const loaded = await loadContext();
      setCtx(loaded);
      const greeting = await companion.speak("greeting", loaded);
      setMessages([{ id: nextId(), role: "cairn", lines: greeting.lines }]);
    })();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [messages, thinking]);

  async function send() {
    const text = draft.trim();
    if (!text || thinking) return;

    const history: ChatTurn[] = messages.map((m) => ({
      role: m.role,
      text: m.lines.join("\n\n"),
    }));

    setDraft("");
    setMessages((m) => [...m, { id: nextId(), role: "you", lines: [text] }]);
    setThinking(true);
    try {
      const reply = await companion.converse(history, text, ctx ?? { current: null });
      const evidence =
        reply.evidence === "proposal" && acceptedRef.current ? undefined : reply.evidence;
      setMessages((m) => [
        ...m,
        { id: nextId(), role: "cairn", lines: reply.lines, evidence },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: nextId(), role: "cairn", lines: ["I lost my words for a second there — try me again?"] },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function restart() {
    setMessages([]);
    setDraft("");
    setThinking(false);
    acceptedRef.current = false;
    const greeting = await companion.speak("greeting", ctx ?? { current: null });
    setMessages([{ id: nextId(), role: "cairn", lines: greeting.lines }]);
  }

  function renderEvidence(m: Message): React.ReactNode {
    if (m.receipt) {
      return <ReceiptCard label="Saved" refText="just now" receipt={m.receipt} />;
    }
    switch (m.evidence) {
      case "history":
        return (
          <PatternCard
            label="Looking back"
            refText="26 weeks"
            weeks={[]}
            months={[]}
            highlight={null}
            caption="You felt steadiest in late March. Want to see what was different then?"
          />
        );
      case "comparison":
        return ctx?.diff ? (
          <DiffCard
            label="What changed"
            refText="this week ↔ Late March"
            nowHead="This week"
            thenHead="Late March"
            rows={ctx.diff.rows}
          />
        ) : null;
      case "proposal":
        return ctx?.proposal ? (
          <MergeCard
            label="A plan to try"
            refText="blend Late March → now"
            blocks={ctx.proposal.blocks}
            note="This touches your schedule and one medication time. Mom and Dr. Reyes will see the change."
          />
        ) : null;
      default:
        return null;
    }
  }

  const ready = messages.length > 0 || thinking;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.sand }]}>      
      <View style={[styles.topbar, { borderBottomColor: c.line }]}>        
        <View style={styles.brand}>          
          <CairnMark size={26} c={c} />          
          <View>            
            <Text style={[styles.brandName, { color: c.ink }]}>Cairn</Text>            
            <Text style={[styles.brandSub, { color: c.inkSoft }]}>              
              a companion that remembers what works            
            </Text>          
          </View>        
        </View>        
        <View style={styles.circle}>          
          <Pressable onPress={() => setSettingsOpen((v) => !v)} hitSlop={8}>            
            <Text style={{ color: c.inkSoft, fontSize: 18 }}>⚙</Text>          
          </Pressable>          
          <Pressable onPress={restart} hitSlop={8}>            
            <Text style={{ color: c.inkSoft, fontSize: 18 }}>↺</Text>          
          </Pressable>        
        </View>      
      </View>

      {settingsOpen ? <Text>Settings</Text> : null}

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>        
        {!ready ? (          
          <View style={styles.loading}>            
            <ActivityIndicator color={c.clay} />            
            <Text style={{ color: c.inkSoft, marginTop: 10 }}>Opening your story…</Text>          
          </View>        
        ) : (          
          <ScrollView ref={scrollRef} style={styles.conv} contentContainerStyle={{ padding: 16 }}>            
            {messages.map((m) =>              
              m.role === "you" ? (                
                <Text key={m.id}>{m.lines[0]}</Text>              
              ) : (                
                <View key={m.id}>                  
                  <Text>{m.lines.join("\n")}</Text>                  
                  {renderEvidence(m)}                
                </View>              
              )            
            )}            
            {thinking ? <ActivityIndicator /> : null}          
          </ScrollView>        
        )}

        <View style={[styles.dock, { borderTopColor: c.line, backgroundColor: c.sand }]}>          
          <View style={styles.composer}>            
            <TextInput              
              style={[styles.input, { backgroundColor: c.sand2, borderColor: c.line, color: c.ink }]}              
              placeholder="Tell Cairn how you're feeling…"              
              placeholderTextColor={c.inkSoft}              
              value={draft}              
              onChangeText={setDraft}            
            />            
            <Pressable              
              onPress={send}              
              style={[                
                styles.send,                
                { backgroundColor: c.ink, opacity: !draft.trim() || thinking ? 0.4 : 1 },              
              ]}            
            >              
              <Text style={{ color: "#fff", fontWeight: "600" }}>Send</Text>            
            </Pressable>          
          </View>        
        </View>      
      </KeyboardAvoidingView>    </SafeAreaView>  );}

const styles = StyleSheet.create({  root: { flex: 1 },  topbar: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },  brand: { flexDirection: "row", alignItems: "center" },  brandName: { fontSize: 18, fontWeight: "600" },  brandSub: { fontSize: 12 },  circle: { flexDirection: "row", alignItems: "center" },  fill: { flex: 1 },  loading: { flex: 1, alignItems: "center", justifyContent: "center" },  conv: { flex: 1 },  dock: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },  composer: { flexDirection: "row", alignItems: "center", flex: 1 },  input: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, marginRight: 10 },  send: { padding: 10, borderRadius: 8, justifyContent: "center", alignItems: "center" },});

async function loadContext(): Promise<CompanionContext> {  try {    return {};  } catch {    return { current: null };  }}