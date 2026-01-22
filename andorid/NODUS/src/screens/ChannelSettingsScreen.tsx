import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Modal, Alert, Clipboard, Share, StatusBar } from 'react-native';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { ChannelAdmin } from '../types';
import { launchImageLibrary } from 'react-native-image-picker';
import { BackIcon, EditIcon, LinkIcon, TrashIcon, LogoutIcon, NotificationIcon, CameraIcon, UsersIcon, ShieldIcon, ShareExternalIcon, ChartIcon } from '../components/Icons';
const postRelay = async (action: string, body: any) => {
  try {
    const res = await fetch('RELAY_URL_PLACEHOLDER', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
    return await res.json();
  } catch { return null; }
};

export const ChannelSettingsScreen = ({ navigation, route }: any) => {
  const { channelId } = route.params;
  const { colors, spacing, radius } = useTheme();
  const { channels, profile, removeChannel, updateChannel } = useStore();
  const channel = channels.find(c => c.id === channelId);

  const [name, setName] = useState(channel?.name || '');
  const [username, setUsername] = useState((channel as any)?.username || '');
  const [description, setDescription] = useState(channel?.description || '');
  const [avatar, setAvatar] = useState(channel?.avatar || '');
  const [admins, setAdmins] = useState<ChannelAdmin[]>((channel as any)?.admins || []);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [showEditName, setShowEditName] = useState(false);
  const [showEditDesc, setShowEditDesc] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<ChannelAdmin | null>(null);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminId, setNewAdminId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isOwner = channel?.ownerId === profile?.fingerprint;
  const isAdmin = isOwner || admins.find(a => a.oderId === profile?.fingerprint)?.role === 'admin';

  useEffect(() => { loadData(); }, [channelId]);

  const loadData = async () => {
    const [adminsRes, subsRes] = await Promise.all([
      postRelay('channelAdmins', { channelId }),
      postRelay('channelSubscribers', { channelId }),
    ]);
    if (adminsRes?.ok && adminsRes.admins) setAdmins(adminsRes.admins);
    if (subsRes?.ok && subsRes.subscribers) setSubscribers(subsRes.subscribers);
  };

  const pickAvatar = async () => {
    if (!isAdmin) return;
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) {
      setAvatar(result.assets[0].uri);
      saveField('avatar', result.assets[0].uri);
    }
  };

  const saveField = async (field: string, value: any) => {
    if (!isAdmin || !channel) return;
    const res = await postRelay('channelUpdate', { channelId, oderId: profile?.fingerprint, [field]: value });
    if (res?.ok) updateChannel(channelId, { [field]: value } as any);
  };

  const generateInviteLink = () => {
    if (!channel) return;
    const link = `nodus://channel/${channel.id}`;
    Clipboard.setString(link);
    Alert.alert('Скопировано', 'Ссылка на канал скопирована');
  };

  const shareInvite = async () => {
    if (!channel) return;
    await Share.share({ message: `Подписывайся на канал "${channel.name}":\nnodus://channel/${channel.id}` });
  };

  const addAdmin = async () => {
    if (!newAdminId.trim() || !isOwner) return;
    setIsLoading(true);
    const res = await postRelay('channelAddAdmin', { channelId, oderId: profile?.fingerprint, adminId: newAdminId.trim() });
    if (res?.ok) { await loadData(); setShowAddAdmin(false); setNewAdminId(''); }
    setIsLoading(false);
  };

  const removeAdmin = async (adminId: string) => {
    const res = await postRelay('channelRemoveAdmin', { channelId, oderId: profile?.fingerprint, adminId });
    if (res?.ok) { setAdmins(admins.filter(a => a.oderId !== adminId)); setShowAdminModal(false); }
  };

  const unsubscribe = () => Alert.alert('Отписаться?', '', [{ text: 'Отмена', style: 'cancel' }, { text: 'Отписаться', style: 'destructive', onPress: async () => {
    await postRelay('channelUnsubscribe', { channelId, userId: profile?.fingerprint });
    removeChannel(channelId);
    navigation.goBack();
  }}]);

  const deleteChannel = () => Alert.alert('Удалить канал?', 'Это действие нельзя отменить', [{ text: 'Отмена', style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: async () => {
    await postRelay('channelDelete', { channelId, oderId: profile?.fingerprint });
    removeChannel(channelId);
    navigation.goBack();
  }}]);

  if (!channel) return null;

  const Section = ({ children }: any) => <View style={{ backgroundColor: colors.surface, marginBottom: spacing.md }}>{children}</View>;
  const Row = ({ icon, label, value, onPress, color }: any) => (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingHorizontal: spacing.lg }} onPress={onPress} disabled={!onPress}>
      {icon && <View style={{ width: 28, marginRight: spacing.md }}>{icon}</View>}
      <View style={{ flex: 1 }}>
        <Text style={{ color: color || colors.text, fontSize: 16 }}>{label}</Text>
        {value && <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{value}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar backgroundColor={colors.accent} barStyle="light-content" />
      
      {/* Header */}
      <View style={{ backgroundColor: colors.accent, paddingTop: spacing.xl, paddingBottom: spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.sm }}>
            <BackIcon size={24} color={colors.background} />
          </TouchableOpacity>
          <Text style={{ color: colors.background, fontSize: 20, fontWeight: '600', marginLeft: spacing.sm }}>Канал</Text>
        </View>
        
        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity onPress={pickAvatar}>
            <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: colors.background + '30', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
              {avatar ? <Image source={{ uri: avatar }} style={{ width: 90, height: 90 }} /> : <Text style={{ color: colors.background, fontSize: 36, fontWeight: '700' }}>{name[0]?.toUpperCase()}</Text>}
            </View>
            {isAdmin && <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.background, borderRadius: 15, padding: 6 }}><CameraIcon size={16} color={colors.accent} /></View>}
          </TouchableOpacity>
          <Text style={{ color: colors.background, fontSize: 22, fontWeight: '700', marginTop: spacing.md }}>{name}</Text>
          <Text style={{ color: colors.background + 'CC', fontSize: 14 }}>{channel.subscriberCount} подписчиков</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Info */}
        <Section>
          {description ? (
            <TouchableOpacity style={{ padding: spacing.lg }} onPress={() => isAdmin && setShowEditDesc(true)}>
              <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{description}</Text>
            </TouchableOpacity>
          ) : isAdmin && (
            <TouchableOpacity style={{ padding: spacing.lg }} onPress={() => setShowEditDesc(true)}>
              <Text style={{ color: colors.accent }}>Добавить описание</Text>
            </TouchableOpacity>
          )}
          {username && (
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              <Text style={{ color: colors.accent, fontSize: 15 }}>@{username}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Ссылка</Text>
            </View>
          )}
        </Section>

        {/* Settings */}
        <Section>
          {isAdmin && <Row icon={<EditIcon size={22} color={colors.accent} />} label="Изменить название" onPress={() => setShowEditName(true)} />}
          <Row icon={<NotificationIcon size={22} color={colors.accent} />} label="Уведомления" value="Включены" />
        </Section>

        {/* Invite */}
        <Section>
          <Row icon={<LinkIcon size={22} color={colors.accent} />} label="Пригласительная ссылка" onPress={generateInviteLink} />
          <Row icon={<ShareExternalIcon size={22} color={colors.accent} />} label="Поделиться каналом" onPress={shareInvite} />
        </Section>

        {/* Admins */}
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>АДМИНИСТРАТОРЫ</Text>
        </View>
        <Section>
          {admins.map(admin => (
            <TouchableOpacity key={admin.oderId} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingHorizontal: spacing.lg }} onPress={() => { setSelectedAdmin(admin); setShowAdminModal(true); }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
                {admin.avatar ? <Image source={{ uri: admin.avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} /> : <Text style={{ color: colors.background, fontSize: 18, fontWeight: '600' }}>{(admin.alias || admin.oderId)[0].toUpperCase()}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{admin.alias || admin.oderId.slice(0, 12)}</Text>
                <Text style={{ color: admin.role === 'owner' ? colors.accent : colors.online, fontSize: 13 }}>{admin.role === 'owner' ? 'создатель' : 'админ'}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {isOwner && <Row icon={<UsersIcon size={22} color={colors.accent} />} label="Добавить админа" onPress={() => setShowAddAdmin(true)} />}
        </Section>

        {/* Subscribers */}
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>{subscribers.length} ПОДПИСЧИКОВ</Text>
        </View>
        <Section>
          {subscribers.slice(0, 5).map(sub => (
            <View key={sub.oderId} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingHorizontal: spacing.lg }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
                <Text style={{ color: colors.accent, fontSize: 18 }}>{(sub.alias || sub.oderId)[0].toUpperCase()}</Text>
              </View>
              <Text style={{ color: colors.text, fontSize: 16 }}>{sub.alias || sub.oderId.slice(0, 12)}</Text>
            </View>
          ))}
          {subscribers.length > 5 && <Row label={`Показать всех (${subscribers.length})`} onPress={() => {}} />}
        </Section>

        {/* Actions */}
        {isOwner && (
          <Section>
            <Row icon={<ChartIcon size={22} color={colors.accent} />} label="Статистика" onPress={() => navigation.navigate('ChannelStats', { channelId })} />
          </Section>
        )}
        {!isOwner && (
          <Section>
            <Row icon={<LogoutIcon size={22} color={colors.error} />} label="Отписаться" color={colors.error} onPress={unsubscribe} />
          </Section>
        )}
        {isOwner && (
          <Section>
            <Row icon={<TrashIcon size={22} color={colors.error} />} label="Удалить канал" color={colors.error} onPress={deleteChannel} />
          </Section>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={showEditName} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: spacing.md }}>Название канала</Text>
            <TextInput style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 16 }} value={name} onChangeText={setName} autoFocus />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.lg, gap: spacing.md }}>
              <TouchableOpacity onPress={() => setShowEditName(false)}><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>ОТМЕНА</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { saveField('name', name.trim()); setShowEditName(false); }}><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>СОХРАНИТЬ</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Description Modal */}
      <Modal visible={showEditDesc} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: spacing.md }}>Описание</Text>
            <TextInput style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 16, minHeight: 100 }} value={description} onChangeText={setDescription} multiline autoFocus />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.lg, gap: spacing.md }}>
              <TouchableOpacity onPress={() => setShowEditDesc(false)}><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>ОТМЕНА</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { saveField('description', description.trim()); setShowEditDesc(false); }}><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>СОХРАНИТЬ</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin Modal */}
      <Modal visible={showAdminModal} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowAdminModal(false)}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg }} onStartShouldSetResponder={() => true}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.textSecondary, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
                <Text style={{ color: colors.background, fontSize: 20, fontWeight: '600' }}>{(selectedAdmin?.alias || selectedAdmin?.oderId || '?')[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{selectedAdmin?.alias || selectedAdmin?.oderId?.slice(0, 12)}</Text>
                <Text style={{ color: colors.textSecondary }}>{selectedAdmin?.role === 'owner' ? 'Создатель' : 'Админ'}</Text>
              </View>
            </View>
            {isOwner && selectedAdmin?.role !== 'owner' && (
              <TouchableOpacity style={{ padding: spacing.md }} onPress={() => removeAdmin(selectedAdmin!.oderId)}>
                <Text style={{ color: colors.error, fontSize: 16 }}>Удалить из админов</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Admin Modal */}
      <Modal visible={showAddAdmin} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: spacing.md }}>Добавить админа</Text>
            <TextInput style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontFamily: 'monospace' }} value={newAdminId} onChangeText={setNewAdminId} placeholder="ID пользователя" placeholderTextColor={colors.textSecondary} autoFocus />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.lg, gap: spacing.md }}>
              <TouchableOpacity onPress={() => setShowAddAdmin(false)}><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>ОТМЕНА</Text></TouchableOpacity>
              <TouchableOpacity onPress={addAdmin}><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>{isLoading ? '...' : 'ДОБАВИТЬ'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
