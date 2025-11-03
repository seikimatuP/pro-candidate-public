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
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  School,
  AccountCircle,
  Logout,
  Sports,
  Group,
  History,
  Info,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { apiConfig } from '../../services/api';

const drawerWidth = 240;

interface AppLayoutProps {
  children: React.ReactNode;
}

const allMenuItems = [
  { text: 'ダッシュボード', icon: <Dashboard />, path: '/', requireAdmin: false },
  { text: '高校生選手', icon: <Sports />, path: '/highschool-players', requireAdmin: false },
  { text: '大学生選手', icon: <Group />, path: '/university-players', requireAdmin: false },
  { text: 'スクレイピング履歴', icon: <History />, path: '/scraping-history', requireAdmin: false },
  { text: '選手管理', icon: <People />, path: '/players', requireAdmin: true },
  { text: '学校管理', icon: <School />, path: '/schools', requireAdmin: true },
];

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { mode, toggleTheme } = useTheme();

  const isAdmin = user?.groups?.includes('admin') || false;

  // 権限に応じてメニューをフィルター
  const menuItems = allMenuItems.filter(item => !item.requireAdmin || isAdmin);

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
      console.error('Logout error:', error);
    }
    handleUserMenuClose();
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          プロ野球志望届
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleMenuClick(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      {/* 環境情報を一番下に配置 */}
      <Box sx={{ mt: 'auto', p: 2, backgroundColor: theme => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50' }}>
        <Typography variant="caption" color="textSecondary" gutterBottom display="block">
          システム情報
        </Typography>
        <Box sx={{ mb: 1 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              px: 1,
              py: 0.5,
              backgroundColor: theme => {
                if (apiConfig.isLocalhost) return theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100';
                return apiConfig.baseURL.includes('/prod') 
                  ? theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light'
                  : theme.palette.mode === 'dark' ? 'info.dark' : 'info.light';
              },
              borderRadius: 1,
              mb: 0.5
            }}
          >
            <Info sx={{ fontSize: 14 }} />
            <Typography variant="caption" fontWeight="bold">
              環境: {apiConfig.isLocalhost ? 'ローカル' : (apiConfig.baseURL.includes('/prod') ? 'prod' : 'dev')}
            </Typography>
          </Box>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              px: 1,
              py: 0.5,
              backgroundColor: theme => apiConfig.useProductionData 
                ? theme.palette.mode === 'dark' ? 'success.dark' : 'success.light'
                : theme.palette.mode === 'dark' ? 'secondary.dark' : 'secondary.light',
              borderRadius: 1
            }}
          >
            <Info sx={{ fontSize: 14 }} />
            <Typography variant="caption" fontWeight="bold">
              API: {apiConfig.useProductionData ? 'AWS API' : 'モック'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            プロ野球候補選手データ収集システム
          </Typography>
          
          {/* ダークモード切り替えボタン */}
          <Tooltip title={mode === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>
            <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
          
          {/* ユーザーメニュー */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="user-menu"
              aria-haspopup="true"
              onClick={handleUserMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
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
            >
              <MenuItem onClick={handleUserMenuClose}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText>
                  {user?.username || 'ユーザー'}
                  {user?.groups?.includes('admin') && (
                    <Typography variant="caption" color="primary" display="block">
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
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
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
        }}
      >
        <Toolbar />
        <Container maxWidth="xl">
          {children}
        </Container>
      </Box>
    </Box>
  );
};