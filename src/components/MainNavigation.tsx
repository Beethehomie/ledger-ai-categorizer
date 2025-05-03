
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
  Home,
  Settings,
  CreditCard,
  BarChart2,
  Users,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '@/hooks/auth';

const MainNavigation = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: <Home className="w-4 h-4 mr-2" />,
    },
    {
      name: 'Business Insight',
      path: '/business-insight',
      icon: <Lightbulb className="w-4 h-4 mr-2" />,
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: <Settings className="w-4 h-4 mr-2" />,
    },
    {
      name: 'Subscription',
      path: '/subscription',
      icon: <CreditCard className="w-4 h-4 mr-2" />,
    }
  ];

  if (isAdmin) {
    navItems.push({
      name: 'Admin',
      path: '/admin',
      icon: <Users className="w-4 h-4 mr-2" />,
    });
  }

  return (
    <NavigationMenu className="max-w-none w-full justify-start mx-auto px-4 py-2 border-b">
      <NavigationMenuList className="space-x-2">
        {navItems.map((item) => (
          <NavigationMenuItem key={item.path}>
            <NavLink to={item.path}>
              {({ isActive }) => (
                <NavigationMenuLink
                  className={cn(
                    navigationMenuTriggerStyle(),
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-background hover:bg-accent/50',
                    'cursor-pointer flex items-center'
                  )}
                >
                  {item.icon}
                  {item.name}
                </NavigationMenuLink>
              )}
            </NavLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default MainNavigation;
