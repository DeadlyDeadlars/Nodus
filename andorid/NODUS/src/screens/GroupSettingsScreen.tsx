import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Modal, Alert, Clipboard, Share, StatusBar } from 'react-native';
import { useTheme } from '../theme';
import { useStore } from '../store';
import { GroupMember } from '../types';
import { encode as b64encode } from 'base-64';
import { launchImageLibrary } from 'react-native-image-picker';
import { BackIcon, CopyClipboardIcon, ShareExternalIcon, EditIcon, UsersIcon, LinkIcon, TrashIcon, LogoutIcon, ShieldIcon, NotificationIcon, CameraIcon, SlowModeIcon } from '../components/Icons';
import { getSlowModeInterval, setSlowMode, SLOWMODE_OPTIONS } from '../services/slowmode';

const RELAY_URLS = ['http://194.87.103.193:3000/relay']; // TODO: Move to config

const postRelay = async (action: string, body: any) => {
  try {
    const res = await fetch(RELAY_URLS[0], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
    return await res.json();
  } catch { return null; }
};

export const GroupSettingsScreen = ({ navigation, route }: any) => {
  const { groupId } = route.params;
  const { colors, spacing, radius } = useTheme();
  const { spaces, profile, removeSpace, updateSpace } = useStore();
  const space = spaces.find(s => s.id === groupId);

  const [name, setName] = useState(space?.name || '');
  const [username, setUsername] = useState((space as any)?.username || '');
  const [description, setDescription] = useState((space as any)?.description || '');
  const [avatar, setAvatar] = useState((space as any)?.avatar || '');
  const [members, setMembers] = useState<GroupMember[]>((space as any)?.members || []);
  const [showEditName, setShowEditName] = useState(false);
  const [showEditDesc, setShowEditDesc] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSlowMode, setShowSlowMode] = useState(false);
  const [currentSlowMode, setCurrentSlowMode] = useState(getSlowModeInterval(groupId));

  const slowModeLabel = SLOWMODE_OPTIONS.find(o => o.value === currentSlowMode)?.label || 'Выкл';

  const isOwner = space?.ownerId === profile?.fingerprint || members.find(m => m.oderId === profile?.fingerprint)?.role === 'owner';
  const isAdmin = isOwner || members.find(m => m.oderId === profile?.fingerprint)?.role === 'admin';

  useEffect(() => { loadMembers(); }, [groupId]);

  const loadMembers = async () => {
    const res = await postRelay('groupMembers', { groupId });
    if (res?.ok && res.members) setMembers(res.members);
  };

  const handleSlowModeChange = (value: number) => {
    setSlowMode(groupId, value);
    setCurrentSlowMode(value);
    setShowSlowMode(false);
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
    if (!isAdmin || !space) return;
    const res = await postRelay('groupUpdate', { groupId, peerId: profile?.fingerprint, [field]: value });
    if (res?.ok) {
      updateSpace(groupId, { [field]: value } as any);
      if (field === 'name') useStore.setState(s => ({ chats: s.chats.map(c => c.groupId === groupId ? { ...c, alias: value } : c) }));
    }
  };

  const generateInviteLink = () => {
    if (!space) return;
    const token = b64encode(JSON.stringify({ id: space.id, name: space.name, fingerprint: space.fingerprint, groupKey: space.groupKey }));
    Clipboard.setString(token);
    Alert.alert('Скопировано', 'Ссылка-приглашение скопирована');
  };

  const shareInvite = async () => {
    if (!space) return;
    const token = b64encode(JSON.stringify({ id: space.id, name: space.name, fingerprint: space.fingerprint, groupKey: space.groupKey }));
    await Share.share({ message: `Присоединяйся к группе "${space.name}":\n\n${token}` });
  };

  const addMember = async () => {
    if (!newMemberId.trim()) return;
    setIsLoading(true);
    const res = await postRelay('groupAddMember', { groupId, oderId: profile?.fingerprint, memberId: newMemberId.trim() });
    if (res?.ok) { await loadMembers(); setShowAddMember(false); setNewMemberId(''); }
    setIsLoading(false);
  };

  const removeMember = async (memberId: string) => {
    const res = await postRelay('groupRemoveMember', { groupId, oderId: profile?.fingerprint, memberId });
    if (res?.ok) { setMembers(members.filter(m => m.oderId !== memberId)); setShowMemberModal(false); }
  };

  const setMemberRole = async (memberId: string, role: 'admin' | 'member') => {
    const res = await postRelay('groupSetRole', { groupId, oderId: profile?.fingerprint, memberId, role });
    if (res?.ok) { setMembers(members.map(m => m.oderId === memberId ? { ...m, role } : m)); setShowMemberModal(false); }
  };

  const leaveGroup = () => Alert.alert('Выйти из группы?', '', [{ text: 'Отмена', style: 'cancel' }, { text: 'Выйти', style: 'destructive', onPress: async () => {
    await postRelay('groupLeave', { groupId, oderId: profile?.fingerprint });
    removeSpace(groupId);
    useStore.setState(s => ({ chats: s.chats.filter(c => c.groupId !== groupId) }));
    navigation.navigate('ChatsList');
  }}]);

  const deleteGroup = () => Alert.alert('Удалить группу?', 'Это действие нельзя отменить', [{ text: 'Отмена', style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: async () => {
    await postRelay('groupDelete', { groupId, oderId: profile?.fingerprint });
    removeSpace(groupId);
    useStore.setState(s => ({ chats: s.chats.filter(c => c.groupId !== groupId) }));
    navigation.navigate('ChatsList');
  }}]);

  if (!space) return null;

  const Section = ({ children }: any) => <View style={{ backgroundColor: colors.surface, marginBottom: spacing.md }}>{children}</View>;
  const Row = ({ icon, label, value, onPress, color, rightIcon }: any) => (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingHorizontal: spacing.lg }} onPress={onPress} disabled={!onPress}>
      {icon && <View style={{ width: 28, marginRight: spacing.md }}>{icon}</View>}
      <View style={{ flex: 1 }}>
        <Text style={{ color: color || colors.text, fontSize: 16 }}>{label}</Text>
        {value && <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{value}</Text>}
      </View>
      {rightIcon}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar backgroundColor={colors.accent} barStyle="light-content" />
      
      {/* Header with avatar */}
      <View style={{ backgroundColor: colors.accent, paddingTop: spacing.xl, paddingBottom: spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.sm }}>
            <BackIcon size={24} color={colors.background} />
          </TouchableOpacity>
          <Text style={{ color: colors.background, fontSize: 20, fontWeight: '600', marginLeft: spacing.sm }}>Группа</Text>
        </View>
        
        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity onPress={pickAvatar}>
            <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: colors.background + '30', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
              {avatar ? <Image source={{ uri: avatar }} style={{ width: 90, height: 90 }} /> : <Text style={{ color: colors.background, fontSize: 36, fontWeight: '700' }}>{name[0]?.toUpperCase()}</Text>}
            </View>
            {isAdmin && <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.background, borderRadius: 15, padding: 6 }}><CameraIcon size={16} color={colors.accent} /></View>}
          </TouchableOpacity>
          <Text style={{ color: colors.background, fontSize: 22, fontWeight: '700', marginTop: spacing.md }}>{name}</Text>
          <Text style={{ color: colors.background + 'CC', fontSize: 14 }}>{members.length} участников</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Info section */}
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
          {isAdmin && <Row icon={<SlowModeIcon size={22} color={colors.accent} />} label="Медленный режим" value={slowModeLabel} onPress={() => setShowSlowMode(true)} />}
        </Section>

        {/* Invite */}
        <Section>
          <Row icon={<LinkIcon size={22} color={colors.accent} />} label="Пригласительная ссылка" onPress={generateInviteLink} />
          <Row icon={<ShareExternalIcon size={22} color={colors.accent} />} label="Поделиться группой" onPress={shareInvite} />
          {isAdmin && <Row icon={<UsersIcon size={22} color={colors.accent} />} label="Добавить участников" onPress={() => setShowAddMember(true)} />}
        </Section>

        {/* Members */}
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>{members.length} УЧАСТНИКОВ</Text>
        </View>
        <Section>
          {members.slice(0, 10).map(member => (
            <TouchableOpacity key={member.oderId} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingHorizontal: spacing.lg }} onPress={() => { setSelectedMember(member); setShowMemberModal(true); }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
                {member.avatar ? <Image source={{ uri: member.avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} /> : <Text style={{ color: colors.background, fontSize: 18, fontWeight: '600' }}>{(member.alias || member.odername || member.oderId)[0].toUpperCase()}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{member.alias || member.odername || member.oderId.slice(0, 12)}</Text>
                <Text style={{ color: member.role === 'owner' ? colors.accent : member.role === 'admin' ? colors.online : colors.textSecondary, fontSize: 13 }}>
                  {member.role === 'owner' ? 'создатель' : member.role === 'admin' ? 'админ' : 'был(а) недавно'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {members.length > 10 && <Row label={`Показать всех (${members.length})`} onPress={() => {}} />}
        </Section>

        {/* Actions */}
        <Section>
          <Row icon={<LogoutIcon size={22} color={colors.error} />} label="Выйти из группы" color={colors.error} onPress={leaveGroup} />
        </Section>
        {isOwner && (
          <Section>
            <Row icon={<TrashIcon size={22} color={colors.error} />} label="Удалить группу" color={colors.error} onPress={deleteGroup} />
          </Section>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={showEditName} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: spacing.md }}>Название группы</Text>
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

      {/* Member Modal */}
      <Modal visible={showMemberModal} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowMemberModal(false)}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg }} onStartShouldSetResponder={() => true}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.textSecondary, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
                <Text style={{ color: colors.background, fontSize: 20, fontWeight: '600' }}>{(selectedMember?.alias || selectedMember?.oderId || '?')[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{selectedMember?.alias || selectedMember?.oderId?.slice(0, 12)}</Text>
                <Text style={{ color: colors.textSecondary }}>{selectedMember?.role === 'owner' ? 'Создатель' : selectedMember?.role === 'admin' ? 'Админ' : 'Участник'}</Text>
              </View>
            </View>
            {isOwner && selectedMember?.role !== 'owner' && (
              <TouchableOpacity style={{ padding: spacing.md }} onPress={() => setMemberRole(selectedMember!.oderId, selectedMember?.role === 'admin' ? 'member' : 'admin')}>
                <Text style={{ color: colors.accent, fontSize: 16 }}>{selectedMember?.role === 'admin' ? 'Снять права админа' : 'Назначить админом'}</Text>
              </TouchableOpacity>
            )}
            {isAdmin && selectedMember?.role !== 'owner' && selectedMember?.oderId !== profile?.fingerprint && (
              <TouchableOpacity style={{ padding: spacing.md }} onPress={() => removeMember(selectedMember!.oderId)}>
                <Text style={{ color: colors.error, fontSize: 16 }}>Удалить из группы</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Member Modal */}
      <Modal visible={showAddMember} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: spacing.md }}>Добавить участника</Text>
            <TextInput style={{ backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontFamily: 'monospace' }} value={newMemberId} onChangeText={setNewMemberId} placeholder="ID пользователя" placeholderTextColor={colors.textSecondary} autoFocus />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.lg, gap: spacing.md }}>
              <TouchableOpacity onPress={() => setShowAddMember(false)}><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>ОТМЕНА</Text></TouchableOpacity>
              <TouchableOpacity onPress={addMember}><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>{isLoading ? '...' : 'ДОБАВИТЬ'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Slow Mode Modal */}
      <Modal visible={showSlowMode} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowSlowMode(false)}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: spacing.md, textAlign: 'center' }}>Медленный режим</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: spacing.lg, textAlign: 'center' }}>Ограничение частоты сообщений</Text>
            {SLOWMODE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: currentSlowMode === opt.value ? colors.accent + '20' : 'transparent', borderRadius: radius.md, marginBottom: spacing.xs }} onPress={() => handleSlowModeChange(opt.value)}>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.accent, marginRight: spacing.md, justifyContent: 'center', alignItems: 'center' }}>
                  {currentSlowMode === opt.value && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent }} />}
                </View>
                <Text style={{ color: colors.text, fontSize: 16 }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
