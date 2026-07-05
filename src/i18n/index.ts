import { useEffect, useState } from 'react';

/**
 * Ultra-light i18n. Dictionary lookup with English fallback.
 * Persisted language lives in `app_settings.language`.
 * Emits `wizchat-language-change` when the user switches so all live
 * subscribers re-render immediately.
 */

export type Lang = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ar';

type Dict = Record<string, string>;

const dictionaries: Record<Lang, Dict> = {
  en: {
    home: 'Home',
    chat: 'Chat',
    friends: 'Friends',
    topics: 'Topics',
    profile: 'Profile',
    settings: 'Settings',
    premium: 'Premium',
    post: 'Post',
    posts: 'Posts',
    like: 'Like',
    comment: 'Comment',
    share: 'Share',
    save: 'Save',
    saved: 'Saved',
    delete: 'Delete',
    cancel: 'Cancel',
    confirm: 'Confirm',
    whats_on_your_mind: "What's on your mind?",
    search_placeholder: 'Search people, posts, images, groups...',
    people: 'People',
    images: 'Images',
    groups: 'Groups',
    follow: 'Follow',
    following: 'Following',
    add_friend: 'Add Friend',
    logout: 'Log out',
    settings_saved: 'Settings saved',
    language_applied: 'Language applied',
  },
  es: {
    home: 'Inicio', chat: 'Chat', friends: 'Amigos', topics: 'Temas',
    profile: 'Perfil', settings: 'Ajustes', premium: 'Premium',
    post: 'Publicar', posts: 'Publicaciones', like: 'Me gusta',
    comment: 'Comentar', share: 'Compartir', save: 'Guardar', saved: 'Guardado',
    delete: 'Eliminar', cancel: 'Cancelar', confirm: 'Confirmar',
    whats_on_your_mind: '¿Qué estás pensando?',
    search_placeholder: 'Buscar personas, publicaciones, imágenes, grupos...',
    people: 'Personas', images: 'Imágenes', groups: 'Grupos',
    follow: 'Seguir', following: 'Siguiendo', add_friend: 'Añadir amigo',
    logout: 'Cerrar sesión', settings_saved: 'Ajustes guardados',
    language_applied: 'Idioma aplicado',
  },
  fr: {
    home: 'Accueil', chat: 'Chat', friends: 'Amis', topics: 'Sujets',
    profile: 'Profil', settings: 'Paramètres', premium: 'Premium',
    post: 'Publier', posts: 'Publications', like: "J'aime",
    comment: 'Commenter', share: 'Partager', save: 'Enregistrer', saved: 'Enregistré',
    delete: 'Supprimer', cancel: 'Annuler', confirm: 'Confirmer',
    whats_on_your_mind: 'Que voulez-vous dire ?',
    search_placeholder: 'Rechercher personnes, publications, images, groupes...',
    people: 'Personnes', images: 'Images', groups: 'Groupes',
    follow: 'Suivre', following: 'Abonné', add_friend: 'Ajouter un ami',
    logout: 'Déconnexion', settings_saved: 'Paramètres enregistrés',
    language_applied: 'Langue appliquée',
  },
  de: {
    home: 'Start', chat: 'Chat', friends: 'Freunde', topics: 'Themen',
    profile: 'Profil', settings: 'Einstellungen', premium: 'Premium',
    post: 'Posten', posts: 'Beiträge', like: 'Gefällt mir',
    comment: 'Kommentar', share: 'Teilen', save: 'Speichern', saved: 'Gespeichert',
    delete: 'Löschen', cancel: 'Abbrechen', confirm: 'Bestätigen',
    whats_on_your_mind: 'Was denkst du gerade?',
    search_placeholder: 'Personen, Beiträge, Bilder, Gruppen suchen...',
    people: 'Personen', images: 'Bilder', groups: 'Gruppen',
    follow: 'Folgen', following: 'Folge ich', add_friend: 'Freund hinzufügen',
    logout: 'Abmelden', settings_saved: 'Einstellungen gespeichert',
    language_applied: 'Sprache angewendet',
  },
  zh: {
    home: '首页', chat: '聊天', friends: '好友', topics: '话题',
    profile: '个人主页', settings: '设置', premium: '会员',
    post: '发布', posts: '帖子', like: '赞', comment: '评论',
    share: '分享', save: '保存', saved: '已保存',
    delete: '删除', cancel: '取消', confirm: '确认',
    whats_on_your_mind: '你在想什么？',
    search_placeholder: '搜索用户、帖子、图片、群组...',
    people: '用户', images: '图片', groups: '群组',
    follow: '关注', following: '已关注', add_friend: '加为好友',
    logout: '退出登录', settings_saved: '设置已保存',
    language_applied: '语言已应用',
  },
  ja: {
    home: 'ホーム', chat: 'チャット', friends: '友達', topics: 'トピック',
    profile: 'プロフィール', settings: '設定', premium: 'プレミアム',
    post: '投稿', posts: '投稿', like: 'いいね', comment: 'コメント',
    share: 'シェア', save: '保存', saved: '保存済み',
    delete: '削除', cancel: 'キャンセル', confirm: '確認',
    whats_on_your_mind: 'いまどうしてる？',
    search_placeholder: '人、投稿、画像、グループを検索...',
    people: '人', images: '画像', groups: 'グループ',
    follow: 'フォロー', following: 'フォロー中', add_friend: '友達に追加',
    logout: 'ログアウト', settings_saved: '設定を保存しました',
    language_applied: '言語を適用しました',
  },
  ar: {
    home: 'الرئيسية', chat: 'الدردشة', friends: 'الأصدقاء', topics: 'المواضيع',
    profile: 'الملف الشخصي', settings: 'الإعدادات', premium: 'المميز',
    post: 'نشر', posts: 'المنشورات', like: 'إعجاب', comment: 'تعليق',
    share: 'مشاركة', save: 'حفظ', saved: 'محفوظ',
    delete: 'حذف', cancel: 'إلغاء', confirm: 'تأكيد',
    whats_on_your_mind: 'بم تفكر؟',
    search_placeholder: 'ابحث عن أشخاص أو منشورات أو صور أو مجموعات...',
    people: 'الأشخاص', images: 'الصور', groups: 'المجموعات',
    follow: 'متابعة', following: 'أتابع', add_friend: 'إضافة صديق',
    logout: 'تسجيل الخروج', settings_saved: 'تم حفظ الإعدادات',
    language_applied: 'تم تطبيق اللغة',
  },
};

const LANG_EVENT = 'wizchat-language-change';

export const getStoredLang = (): Lang => {
  try {
    const raw = localStorage.getItem('app_settings');
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.language && dictionaries[s.language as Lang]) return s.language as Lang;
    }
  } catch {}
  return 'en';
};

export const setStoredLang = (lang: Lang) => {
  try {
    const raw = localStorage.getItem('app_settings');
    const s = raw ? JSON.parse(raw) : {};
    s.language = lang;
    localStorage.setItem('app_settings', JSON.stringify(s));
  } catch {}
  document.documentElement.lang = lang;
  document.documentElement.dir = ['ar', 'he', 'fa', 'ur'].includes(lang) ? 'rtl' : 'ltr';
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: { lang } }));
};

export const t = (key: string, lang?: Lang): string => {
  const l = lang || getStoredLang();
  return dictionaries[l]?.[key] || dictionaries.en[key] || key;
};

export function useT() {
  const [lang, setLang] = useState<Lang>(() => getStoredLang());
  useEffect(() => {
    const h = (e: any) => setLang(e?.detail?.lang || getStoredLang());
    window.addEventListener(LANG_EVENT, h);
    return () => window.removeEventListener(LANG_EVENT, h);
  }, []);
  return {
    lang,
    t: (key: string) => t(key, lang),
  };
}
