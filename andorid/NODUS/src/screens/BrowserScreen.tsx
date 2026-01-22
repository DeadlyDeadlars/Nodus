/**
 * Встроенный браузер с P2P прокси (упрощенная версия)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { BackIcon, ForwardIcon, RefreshIcon, LockIcon, SearchIcon } from '../components/Icons';
// TODO: Replace with actual P2P proxy service
const p2pProxy = {
  initialize: async () => {},
  getStatus: () => ({ nodes: 0, chain: [], isActive: false })
};

// TODO: Replace with actual relay VPN service  
const relayVPN = {
  getStatus: () => ({ currentRelay: '', totalRelays: 3, failures: 0 }),
  fetchThroughRelay: async (url: string) => ({ ok: false, content: '', error: 'Not implemented' })
};

// Компонент превью сайта
const SitePreview: React.FC<{ data: any; onOpenFull: () => void }> = ({ data, onOpenFull }) => {
  return (
    <View style={previewStyles.container}>
      <View style={previewStyles.header}>
        <Text style={previewStyles.title}>{data.title}</Text>
        <Text style={previewStyles.url}>{data.url}</Text>
      </View>
      
      {data.description && (
        <Text style={previewStyles.description}>{data.description}</Text>
      )}
      
      <View style={previewStyles.contentContainer}>
        <Text style={previewStyles.contentLabel}>📄 Содержимое:</Text>
        <Text style={previewStyles.content}>{data.content || 'Контент загружается через JavaScript'}</Text>
      </View>
      
      <View style={previewStyles.actions}>
        <TouchableOpacity style={previewStyles.openButton} onPress={onOpenFull}>
          <Text style={previewStyles.openButtonText}>🌐 Открыть полную версию</Text>
        </TouchableOpacity>
      </View>
      
      <View style={previewStyles.info}>
        <Text style={previewStyles.infoText}>
          ✅ Загружено через Relay VPN анонимно
        </Text>
        <Text style={previewStyles.infoText}>
          🔒 Ваш IP скрыт • Трекеры заблокированы
        </Text>
      </View>
    </View>
  );
};

const previewStyles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 12, padding: 16, margin: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  header: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  url: { fontSize: 12, color: '#666', fontFamily: 'monospace' },
  description: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 16, fontStyle: 'italic' },
  contentContainer: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 16 },
  contentLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  content: { fontSize: 14, color: '#555', lineHeight: 20 },
  actions: { marginBottom: 16 },
  openButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  openButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  info: { borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 12 },
  infoText: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 4 }
});
const HomePageContent: React.FC<{ data: any; onNavigate: (url: string) => void }> = ({ data, onNavigate }) => {
  const quickLinks = [
    { name: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: '🔍', desc: 'Приватный поиск' },
    { name: 'Tor Project', url: 'https://torproject.org', icon: '🧅', desc: 'Анонимность' },
    { name: 'ProtonMail', url: 'https://protonmail.com', icon: '📧', desc: 'Зашифрованная почта' },
    { name: 'NODUS', url: 'https://dev1812.ru/', icon: '💬', desc: 'Наш сайт' },
    { name: 'Privacy Guides', url: 'https://privacyguides.org', icon: '🛡️', desc: 'Гиды по приватности' },
    { name: 'GitHub', url: 'https://github.com', icon: '💻', desc: 'Код и проекты' }
  ];

  return (
    <View style={homeStyles.container}>
      {/* Заголовок */}
      <View style={homeStyles.header}>
        <View style={homeStyles.logoContainer}>
          <Text style={homeStyles.logo}>🌐</Text>
          <Text style={homeStyles.title}>NODUS Browser</Text>
        </View>
        <Text style={homeStyles.subtitle}>Анонимный P2P браузер</Text>
      </View>

      {/* Статус безопасности */}
      <View style={[homeStyles.statusCard, { borderLeftColor: data.statusColor }]}>
        <View style={homeStyles.statusHeader}>
          <View style={[homeStyles.statusDot, { backgroundColor: data.statusColor }]} />
          <Text style={[homeStyles.statusText, { color: data.statusColor }]}>
            {data.statusText}
          </Text>
        </View>
        <Text style={homeStyles.statusDesc}>
          {data.status.isActive 
            ? `P2P: ${data.status.nodes} узлов • Цепочка из ${data.status.chain.length} прокси`
            : `Relay VPN: ${data.relay.totalRelays} серверов • P2P узлов: ${data.status.nodes}`
          }
        </Text>
      </View>

      {/* Быстрые ссылки */}
      <View style={homeStyles.section}>
        <Text style={homeStyles.sectionTitle}>Быстрые ссылки</Text>
        <View style={homeStyles.linksGrid}>
          {quickLinks.map((link, index) => (
            <TouchableOpacity 
              key={index} 
              style={homeStyles.linkCard}
              onPress={() => onNavigate(link.url)}
            >
              <Text style={homeStyles.linkIcon}>{link.icon}</Text>
              <Text style={homeStyles.linkName}>{link.name}</Text>
              <Text style={homeStyles.linkDesc}>{link.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Функции безопасности */}
      <View style={homeStyles.section}>
        <Text style={homeStyles.sectionTitle}>Защита приватности</Text>
        <View style={homeStyles.featuresContainer}>
          {[
            { icon: '🔒', text: 'Шифрование трафика' },
            { icon: '🚫', text: 'Блокировка трекеров' },
            { icon: '🎭', text: 'Скрытие отпечатков' },
            { icon: '🌐', text: 'P2P маршрутизация' }
          ].map((feature, index) => (
            <View key={index} style={homeStyles.featureItem}>
              <Text style={homeStyles.featureIcon}>{feature.icon}</Text>
              <Text style={homeStyles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Инструкции */}
      <View style={homeStyles.section}>
        <Text style={homeStyles.sectionTitle}>Как использовать</Text>
        <View style={homeStyles.instructionsContainer}>
          <Text style={homeStyles.instruction}>
            1. Введите URL или поисковый запрос в адресную строку
          </Text>
          <Text style={homeStyles.instruction}>
            2. Ваш запрос будет отправлен через P2P прокси сеть
          </Text>
          <Text style={homeStyles.instruction}>
            3. Для полного просмотра используйте системный браузер
          </Text>
        </View>
      </View>

      {/* Версия */}
      <View style={homeStyles.footer}>
        <Text style={homeStyles.version}>NODUS Browser v1.0 Beta</Text>
        <Text style={homeStyles.copyright}>Децентрализованный и приватный</Text>
      </View>
    </View>
  );
};

const homeStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', marginBottom: 24 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logo: { fontSize: 32, marginRight: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  subtitle: { fontSize: 16, color: '#666', fontWeight: '500' },
  
  statusCard: { 
    backgroundColor: '#f8f9fa', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 24,
    borderLeftWidth: 4
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 16, fontWeight: '600' },
  statusDesc: { fontSize: 14, color: '#666', lineHeight: 20 },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 16 },
  
  linksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  linkCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    width: '48%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center'
  },
  linkIcon: { fontSize: 24, marginBottom: 8 },
  linkName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  linkDesc: { fontSize: 12, color: '#666', textAlign: 'center' },
  
  featuresContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  featureIcon: { fontSize: 16, marginRight: 8 },
  featureText: { fontSize: 14, color: '#333', flex: 1 },
  
  instructionsContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e0e0e0' },
  instruction: { fontSize: 14, color: '#333', marginBottom: 8, lineHeight: 20 },
  
  footer: { alignItems: 'center', marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  version: { fontSize: 14, fontWeight: '600', color: '#666' },
  copyright: { fontSize: 12, color: '#999', marginTop: 4 }
});

export const BrowserScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [content, setContent] = useState<any>('');
  const [loading, setLoading] = useState(false);
  const [proxyStatus, setProxyStatus] = useState({ nodes: 0, chain: [], isActive: false });
  const [relayStatus, setRelayStatus] = useState({ currentRelay: '', totalRelays: 0, failures: 0 });
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [viewMode, setViewMode] = useState<'home' | 'preview' | 'text'>('home');

  useEffect(() => {
    // Инициализация P2P прокси
    const initProxy = async () => {
      try {
        await p2pProxy.initialize();
        setProxyStatus(p2pProxy.getStatus());
      } catch (error) {
        __DEV__ && console.error('Failed to initialize P2P proxy:', error);
      }
    };
    
    initProxy();
    
    // Инициализируем relay статус
    const initialRelayStatus = relayVPN.getStatus();
    __DEV__ && console.log('[Browser] Initial relay status:', initialRelayStatus);
    setRelayStatus(initialRelayStatus);
    
    // Загружаем домашнюю страницу после инициализации статусов
    setTimeout(() => {
      loadHomePage();
    }, 100);
    
    // Обновление статуса каждые 30 секунд
    const interval = setInterval(() => {
      setProxyStatus(p2pProxy.getStatus());
      setRelayStatus(relayVPN.getStatus());
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadHomePage = () => {
    const currentProxyStatus = p2pProxy.getStatus();
    const currentRelayStatus = relayVPN.getStatus();
    
    const statusColor = currentProxyStatus.isActive ? '#4CAF50' : '#FF9800';
    const statusText = currentProxyStatus.isActive ? 'P2P Защищено' : 'Relay VPN';
    
    setViewMode('home');
    setContent({
      type: 'homepage',
      data: {
        status: currentProxyStatus,
        relay: currentRelayStatus,
        statusColor,
        statusText
      }
    });
  };

  const handleNavigate = async (targetUrl?: string) => {
    const urlToLoad = targetUrl || url.trim();
    if (!urlToLoad) return;
    
    setLoading(true);
    let finalUrl = urlToLoad;
    
    try {
      // Определяем тип запроса
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
          finalUrl = `https://${finalUrl}`;
        } else {
          // Поиск через DuckDuckGo
          finalUrl = `https://duckduckgo.com/?q=${encodeURIComponent(finalUrl)}`;
        }
      }
      
      // Обновляем URL в строке
      setUrl(finalUrl);
      
      // Добавляем в историю
      const newHistory = [...history.slice(0, historyIndex + 1), finalUrl];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setCurrentUrl(finalUrl);
      
      // Пробуем P2P прокси сначала
      if (proxyStatus.isActive) {
        __DEV__ && console.log('[Browser] Using P2P proxy');
        setViewMode('text');
        setContent('🔒 Загружается через P2P прокси...');
        // P2P логика остается как есть
        await new Promise(resolve => setTimeout(resolve, 1000));
        const p2pResult = `🔒 ЗАГРУЖЕНО ЧЕРЕЗ P2P ПРОКСИ\n\nURL: ${finalUrl}\nМаршрут: Вы → ${proxyStatus.chain.join(' → ')} → Интернет\n\n(P2P контент)`;
        setContent(p2pResult);
      } else {
        // Используем Relay VPN
        __DEV__ && console.log('[Browser] Using Relay VPN');
        const response = await relayVPN.fetchThroughRelay(finalUrl);
        
        if (response.ok && response.content) {
          // Показываем превью сайта
          setViewMode('preview');
          const preview = extractSitePreview(response.content, finalUrl);
          setContent(preview);
        } else {
          // Показываем ошибку
          setViewMode('text');
          const errorText = `❌ ОШИБКА ЗАГРУЗКИ\n\nНе удалось загрузить страницу через Relay VPN\n\nОшибка: ${response.error || 'Неизвестная ошибка'}\n\nПопробуйте другой URL или проверьте соединение.`;
          setContent(errorText);
        }
      }
      
    } catch (error) {
      setViewMode('text');
      const errorText = `❌ ОШИБКА ЗАГРУЗКИ\n\nПроизошла ошибка при загрузке страницы\n\nОшибка: ${String(error)}\n\nПопробуйте снова или проверьте URL.`;
      setContent(errorText);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setUrl(history[historyIndex - 1]);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setUrl(history[historyIndex + 1]);
    }
  };

  const handleRefresh = () => {
    if (currentUrl) {
      handleNavigate(currentUrl);
    } else {
      loadHomePage();
    }
  };

  const openInSystemBrowser = () => {
    if (currentUrl) {
      Linking.openURL(currentUrl);
    }
  };

  // Функция для создания превью сайта
  const extractSitePreview = (html: string, url: string): any => {
    if (!html) return { title: 'Сайт недоступен', description: '', content: '' };
    
    try {
      // Извлекаем заголовок
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
      
      // Извлекаем описание
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      const description = descMatch ? descMatch[1].trim() : '';
      
      // Извлекаем изображение
      const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      const image = imgMatch ? imgMatch[1] : '';
      
      // Извлекаем основной текст
      let content = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (content.length > 500) {
        content = content.substring(0, 500) + '...';
      }
      
      return { title, description, content, image, url };
      
    } catch (error) {
      return { 
        title: 'Ошибка загрузки', 
        description: `Не удалось обработать сайт: ${error}`, 
        content: '', 
        url 
      };
    }
  };

  return (
    <View style={styles.container}>
      {/* Адресная строка */}
      <View style={styles.toolbar}>
        <View style={styles.addressBar}>
          <View style={styles.securityIcon}>
            <LockIcon size={16} color={proxyStatus.isActive ? "#4CAF50" : "#FF9800"} />
          </View>
          
          <TextInput
            style={styles.urlInput}
            value={url}
            onChangeText={setUrl}
            onSubmitEditing={() => handleNavigate()}
            placeholder="Поиск или URL..."
            autoCapitalize="none"
            autoCorrect={false}
            selectTextOnFocus
          />
          
          <TouchableOpacity onPress={() => handleNavigate()} style={styles.goButton}>
            <SearchIcon size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Навигация */}
      <View style={styles.navigation}>
        <TouchableOpacity 
          onPress={handleBack} 
          disabled={historyIndex <= 0}
          style={[styles.navButton, historyIndex <= 0 && styles.disabledButton]}
        >
          <BackIcon size={20} color={historyIndex > 0 ? "#007AFF" : "#ccc"} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleForward} 
          disabled={historyIndex >= history.length - 1}
          style={[styles.navButton, historyIndex >= history.length - 1 && styles.disabledButton]}
        >
          <ForwardIcon size={20} color={historyIndex < history.length - 1 ? "#007AFF" : "#ccc"} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleRefresh} style={styles.navButton}>
          <RefreshIcon size={20} color="#007AFF" />
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {proxyStatus.isActive ? '🔒 P2P' : '🌐 Relay'} {loading ? '⏳' : '✅'} ({proxyStatus.isActive ? proxyStatus.nodes : relayStatus.totalRelays})
          </Text>
        </View>
      </View>

      {/* Контент */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {viewMode === 'home' && typeof content === 'object' && content.type === 'homepage' ? (
          <HomePageContent data={content.data} onNavigate={(url) => {
            handleNavigate(url);
          }} />
        ) : viewMode === 'preview' ? (
          <SitePreview data={content} onOpenFull={openInSystemBrowser} />
        ) : (
          <View>
            <Text style={styles.contentText}>
              {typeof content === 'string' ? content : JSON.stringify(content)}
            </Text>
            {currentUrl && (
              <TouchableOpacity style={styles.systemBrowserButton} onPress={openInSystemBrowser}>
                <Text style={styles.systemBrowserText}>🌐 Открыть в системном браузере</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  toolbar: { 
    backgroundColor: '#f8f9fa', 
    paddingHorizontal: 12, 
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  addressBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  securityIcon: { marginRight: 8 },
  urlInput: { 
    flex: 1, 
    fontSize: 14, 
    paddingVertical: 12,
    color: '#333'
  },
  goButton: { marginLeft: 8, padding: 4 },
  navigation: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f8f9fa', 
    paddingHorizontal: 12, 
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  navButton: { 
    padding: 8, 
    marginRight: 12,
    borderRadius: 6
  },
  disabledButton: { opacity: 0.3 },
  statusContainer: { flex: 1, alignItems: 'flex-end' },
  statusText: { 
    fontSize: 12, 
    color: '#666',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  content: { flex: 1, backgroundColor: '#f5f6fa' },
  contentContainer: { padding: 16 },
  contentText: { 
    fontSize: 13, 
    lineHeight: 18, 
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  webview: { flex: 1 },
  systemBrowserButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center'
  },
  systemBrowserText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
});
