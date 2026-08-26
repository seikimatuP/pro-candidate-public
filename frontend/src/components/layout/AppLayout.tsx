import React from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  Menu,
  MenuItem,
  Avatar,
  Button,
  Tooltip,
  Link as MuiLink,
  useTheme as useMuiTheme,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  School,
  AccountCircle,
  Login,
  Logout,
  Sports,
  Group,
  History,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { log as logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';

const drawerWidth = 260; // 少し幅を広げてモダンに

// フッターは全ページ共通で高さを固定する（レイアウトシフト＝CLS を起こさないため）。
// 出所表記を1行足したぶん、従来の 56px から広げている
const footerHeight = 76;

// フッターに並べる静的ページへのリンク（SPA のルートではなく public/ の実ファイル）
const footerLinks = [
  { text: 'プライバシーポリシー', href: '/privacy.html' },
  { text: '利用規約', href: '/terms.html' },
  { text: '免責事項', href: '/terms.html#disclaimer' },
];

// データの出所（#L4）。掲載しているのは各連盟が公式サイトで公示した情報である、
// という事実と、その一次情報へのリンクを全ページの足元に置く
const dataSources = [
  { label: '日本高等学校野球連盟', href: 'https://www.jhbf.or.jp/pro-aspiring/' },
  { label: '全日本大学野球連盟', href: 'https://www.jubf.net/system/prog/procandidate.php' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

const mainMenuItems = [
  { text: 'ダッシュボード', icon: <Dashboard />, path: '/' },
  { text: '高校生', icon: <Sports />, path: '/highschool-players', requireAdmin: true },
  { text: '大学生', icon: <Group />, path: '/university-players', requireAdmin: true },
];

const adminMenuItems = [
  { text: 'スクレイピング履歴', icon: <History />, path: '/scraping-history', requireAdmin: true },
  { text: '選手管理', icon: <People />, path: '/players', requireAdmin: true },
  { text: '学校管理', icon: <School />, path: '/schools', requireAdmin: true },
];

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isAuthenticated } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();

  const isAdmin = user?.groups?.includes('admin') || false;

  const visibleMainItems = mainMenuItems.filter(item => !item.requireAdmin || isAdmin);
  const visibleAdminItems = adminMenuItems.filter(item => !item.requireAdmin || isAdmin);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    setMobileOpen(false); // モバイルでメニューを閉じる
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth/login'); // ログインページにリダイレクト
    } catch (error) {
      logger.error('Logout error:', error);
    }
    handleUserMenuClose();
  };

  const renderMenuItem = (item: { text: string; icon: React.ReactNode; path: string }) => {
    const isSelected = location.pathname === item.path;
    return (
      <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
        <ListItemButton
          selected={isSelected}
          onClick={() => handleMenuClick(item.path)}
          sx={{
            borderRadius: 2,
            position: 'relative',
            backgroundColor: isSelected ? alpha(muiTheme.palette.primary.main, 0.1) : 'transparent',
            color: isSelected ? 'primary.main' : 'text.secondary',
            '&:hover': {
              backgroundColor: alpha(muiTheme.palette.primary.main, 0.05),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(muiTheme.palette.primary.main, 0.15),
              '&:hover': {
                backgroundColor: alpha(muiTheme.palette.primary.main, 0.2),
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: '20%',
                bottom: '20%',
                width: 3,
                borderRadius: '0 2px 2px 0',
                bgcolor: muiTheme.palette.primary.main,
              },
            },
          }}
        >
          <ListItemIcon
            sx={{ color: isSelected ? 'primary.main' : 'text.secondary', minWidth: 40 }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.text}
            slotProps={{
              primary: {
                sx: {
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: '0.95rem',
                },
              },
            }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          minHeight: '70px !important',
        }}
      >
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ fontWeight: 700, color: 'primary.main' }}
        >
          プロ野球志望届
        </Typography>
      </Toolbar>
      <Divider sx={{ opacity: 0.1 }} />
      <List sx={{ px: 2, pt: 2, pb: 1 }}>{visibleMainItems.map(renderMenuItem)}</List>
      {visibleAdminItems.length > 0 && (
        <>
          <Typography
            variant="caption"
            sx={{
              px: 3,
              pt: 2,
              pb: 0.5,
              color: 'text.disabled',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: '0.7rem',
            }}
          >
            管理ツール
          </Typography>
          <List sx={{ px: 2, pt: 0.5, pb: 2 }}>{visibleAdminItems.map(renderMenuItem)}</List>
        </>
      )}
      <Box sx={{ flexGrow: 1 }} />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', backgroundColor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          boxShadow: 'none',
          borderBottom: `1px solid ${alpha(muiTheme.palette.divider, 0.1)}`,
        }}
      >
        <Toolbar sx={{ minHeight: '70px !important' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          {/* ダークモード切り替えボタン */}
          <Tooltip title={mode === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>
            <IconButton
              aria-label={mode === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
              sx={{
                ml: 1,
                backgroundColor: alpha(muiTheme.palette.action.active, 0.05),
                '&:hover': {
                  backgroundColor: alpha(muiTheme.palette.action.active, 0.1),
                },
              }}
              onClick={toggleTheme}
              color="inherit"
            >
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>

          {/* 未ログイン時のログイン導線（閲覧系ページは認証不要で表示される） */}
          {!isAuthenticated && (
            <Button
              color="inherit"
              startIcon={<Login />}
              onClick={() => navigate('/auth/login')}
              sx={{ ml: 2, fontWeight: 600 }}
            >
              ログイン
            </Button>
          )}

          {/* ユーザーメニュー（ログイン時のみ表示） */}
          {isAuthenticated && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls="user-menu"
                aria-haspopup="true"
                onClick={handleUserMenuOpen}
                color="inherit"
                sx={{ p: 0.5 }}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'primary.main',
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase() || <AccountCircle />}
                </Avatar>
              </IconButton>
              <Menu
                id="user-menu"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleUserMenuClose}
                slotProps={{
                  paper: {
                    elevation: 0,
                    sx: {
                      overflow: 'visible',
                      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                      mt: 1.5,
                      '& .MuiAvatar-root': {
                        width: 32,
                        height: 32,
                        ml: -0.5,
                        mr: 1,
                      },
                      '&:before': {
                        content: '""',
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: 'background.paper',
                        transform: 'translateY(-50%) rotate(45deg)',
                        zIndex: 0,
                      },
                    },
                  },
                }}
              >
                <MenuItem onClick={handleUserMenuClose} sx={{ minWidth: 180 }}>
                  <ListItemIcon>
                    <AccountCircle fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 'bold',
                      }}
                    >
                      {user?.username || 'ユーザー'}
                    </Typography>
                    {user?.groups?.includes('admin') && (
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{
                          display: 'block',
                        }}
                      >
                        管理者
                      </Typography>
                    )}
                  </ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>ログアウト</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        {/* モバイル用ドロワー */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // モバイルパフォーマンス向上
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>

        {/* デスクトップ用ドロワー */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100dvh',
          // 本文が短いページでもフッターを最下部に置くため縦方向のフレックスにする
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar sx={{ minHeight: '70px !important' }} />
        <Container maxWidth="xl" sx={{ pt: 2, pb: 4, flexGrow: 1 }} className="fade-in">
          {children}
        </Container>

        {/* 共通フッター: プライバシーポリシー・利用規約への導線（未ログインでも表示） */}
        <Box
          component="footer"
          sx={{
            flexShrink: 0,
            minHeight: `${footerHeight}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            rowGap: 0.5,
            py: 1,
            px: { xs: 0, sm: 1 },
            borderTop: `1px solid ${alpha(muiTheme.palette.divider, 0.2)}`,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: { xs: 'center', sm: 'left' } }}
          >
            データ出典:{' '}
            {dataSources.map((source, index) => (
              <React.Fragment key={source.href}>
                {index > 0 && ' / '}
                <MuiLink
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  color="inherit"
                  sx={{ '&:hover': { color: 'primary.main' } }}
                >
                  {source.label}
                </MuiLink>
              </React.Fragment>
            ))}{' '}
            が公式サイトで公示したプロ野球志望届の提出者情報。本サイトは各連盟とは関係のない個人が運営しています。
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: { xs: 'center', sm: 'space-between' },
              columnGap: 3,
              rowGap: 0.5,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              © {new Date().getFullYear()} プロ野球志望届データ管理システム
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5 }}>
              {footerLinks.map(link => (
                <MuiLink
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  variant="caption"
                  color="text.secondary"
                  sx={{ '&:hover': { color: 'primary.main' } }}
                >
                  {link.text}
                </MuiLink>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
