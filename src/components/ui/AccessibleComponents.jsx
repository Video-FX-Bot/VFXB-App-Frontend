/**
 * Accessible UI components following WCAG guidelines
 */
import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import {
  useFocusManagement,
  useKeyboardNavigation,
  useAriaAttributes,
  useLiveAnnouncer,
  useUniqueId,
  useReducedMotion,
  useEscapeKey,
  useClickOutside,
  useDisclosure,
  useRovingTabIndex,
} from '../../hooks/useAccessibility';

// Accessible Button Component
export const AccessibleButton = forwardRef((
  {
    children,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    loadingText = 'Loading...',
    onClick,
    className = '',
    ariaLabel,
    ariaDescribedBy,
    ...props
  },
  ref
) => {
  const { announce } = useLiveAnnouncer();
  const { prefersReducedMotion } = useReducedMotion();

  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  const handleClick = (e) => {
    if (disabled || loading) return;
    
    if (onClick) {
      onClick(e);
    }
    
    // Announce action for screen readers
    if (ariaLabel) {
      announce(`${ariaLabel} activated`);
    }
  };

  const motionProps = prefersReducedMotion
    ? {}
    : {
        whileTap: { scale: 0.98 },
        whileHover: { scale: 1.02 },
      };

  return (
    <motion.button
      ref={ref}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      {...motionProps}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="sr-only">{loadingText}</span>
          {loadingText}
        </>
      ) : (
        children
      )}
    </motion.button>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

// Accessible Dropdown Component
export const AccessibleDropdown = ({
  trigger,
  children,
  placement = 'bottom-start',
  className = '',
  onOpenChange,
}) => {
  const { isOpen, triggerProps, contentProps, close } = useDisclosure({
    onOpen: () => onOpenChange?.(true),
    onClose: () => onOpenChange?.(false),
  });
  
  const { containerRef } = useFocusManagement({
    trapFocus: isOpen,
    restoreFocus: true,
  });
  
  const dropdownRef = useClickOutside((e, clickedFocusable) => {
    // Only close if not clicking on a focusable element within the dropdown
    if (!clickedFocusable) {
      close();
    }
  }, isOpen);
  
  useEscapeKey(close, isOpen);
  const { prefersReducedMotion } = useReducedMotion();

  const motionProps = prefersReducedMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.95, y: -10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: -10 },
        transition: { duration: 0.2 },
      };

  return (
    <div ref={containerRef} className="relative inline-block">
      {React.cloneElement(trigger, {
        ...triggerProps,
        className: `${trigger.props.className || ''} ${isOpen ? 'ring-2 ring-blue-500' : ''}`,
      })}
      
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          className={`
            absolute z-50 mt-1 bg-white rounded-lg shadow-lg border border-gray-200
            min-w-[200px] max-w-sm
            ${placement.includes('right') ? 'right-0' : 'left-0'}
            ${className}
          `}
          {...contentProps}
          {...motionProps}
        >
          <div className="py-1">
            {children}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Accessible Dropdown Item
export const AccessibleDropdownItem = ({
  children,
  onClick,
  disabled = false,
  className = '',
  icon: Icon,
  shortcut,
}) => {
  const { announce } = useLiveAnnouncer();

  const handleClick = () => {
    if (disabled) return;
    
    if (onClick) {
      onClick();
    }
    
    announce(`${children} selected`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      className={`
        flex items-center px-4 py-2 text-sm cursor-pointer
        ${disabled
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-700 hover:bg-gray-100 focus:bg-gray-100'
        }
        focus:outline-none
        ${className}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled}
    >
      {Icon && (
        <Icon className="w-4 h-4 mr-3" aria-hidden="true" />
      )}
      <span className="flex-1">{children}</span>
      {shortcut && (
        <span className="ml-3 text-xs text-gray-400" aria-label={`Keyboard shortcut: ${shortcut}`}>
          {shortcut}
        </span>
      )}
    </div>
  );
};

// Accessible Alert Component
export const AccessibleAlert = ({
  type = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className = '',
}) => {
  const { announce } = useLiveAnnouncer();
  const alertId = useUniqueId('alert');
  const titleId = useUniqueId('alert-title');

  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  const Icon = icons[type];

  React.useEffect(() => {
    // Announce alert to screen readers
    const message = title ? `${title}. ${children}` : children;
    announce(message, type === 'error' ? 'assertive' : 'polite');
  }, [title, children, type, announce]);

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
    announce('Alert dismissed');
  };

  return (
    <div
      id={alertId}
      role="alert"
      aria-labelledby={title ? titleId : undefined}
      className={`
        flex items-start p-4 border rounded-lg
        ${styles[type]}
        ${className}
      `}
    >
      <Icon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
      
      <div className="flex-1">
        {title && (
          <h3 id={titleId} className="font-medium mb-1">
            {title}
          </h3>
        )}
        <div className="text-sm">
          {children}
        </div>
      </div>
      
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="ml-3 flex-shrink-0 p-1 rounded-md hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

// Accessible Accordion Component
export const AccessibleAccordion = ({ children, allowMultiple = false, className = '' }) => {
  const [openItems, setOpenItems] = React.useState(new Set());

  const toggleItem = (itemId) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(itemId);
      }
      
      return newSet;
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            isOpen: openItems.has(child.props.id || index),
            onToggle: () => toggleItem(child.props.id || index),
          });
        }
        return child;
      })}
    </div>
  );
};

// Accessible Accordion Item
export const AccessibleAccordionItem = ({
  id,
  title,
  children,
  isOpen = false,
  onToggle,
  className = '',
}) => {
  const { announce } = useLiveAnnouncer();
  const { prefersReducedMotion } = useReducedMotion();
  const triggerId = useUniqueId('accordion-trigger');
  const contentId = useUniqueId('accordion-content');

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    }
    announce(isOpen ? 'Collapsed' : 'Expanded');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { height: 0, opacity: 0 },
        animate: { height: 'auto', opacity: 1 },
        exit: { height: 0, opacity: 0 },
        transition: { duration: 0.3 },
      };

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      <button
        id={triggerId}
        className="w-full px-4 py-3 text-left font-medium text-gray-900 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-t-lg"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <div className="flex items-center justify-between">
          <span>{title}</span>
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </div>
      </button>
      
      {isOpen && (
        <motion.div
          id={contentId}
          role="region"
          aria-labelledby={triggerId}
          className="px-4 py-3 border-t border-gray-200"
          {...motionProps}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
};

// Accessible Tab Component
export const AccessibleTabs = ({
  children,
  defaultTab = 0,
  orientation = 'horizontal',
  className = '',
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab);
  const tabListRef = React.useRef(null);
  const { announce } = useLiveAnnouncer();

  const tabs = React.Children.toArray(children).filter(
    child => React.isValidElement(child) && child.type === AccessibleTab
  );

  const { handleKeyDown } = useKeyboardNavigation(tabs, {
    orientation,
    onNavigate: (index) => {
      setActiveTab(index);
      if (onTabChange) {
        onTabChange(index);
      }
      announce(`${tabs[index].props.label} tab selected`);
    },
  });

  return (
    <div className={className}>
      <div
        ref={tabListRef}
        role="tablist"
        aria-orientation={orientation}
        className={`flex ${orientation === 'vertical' ? 'flex-col' : 'border-b border-gray-200'}`}
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          return (
            <button
              key={index}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              aria-selected={isActive}
              aria-controls={`tabpanel-${index}`}
              id={`tab-${index}`}
              className={`
                px-4 py-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                ${isActive
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
              onClick={() => {
                setActiveTab(index);
                if (onTabChange) {
                  onTabChange(index);
                }
              }}
            >
              {tab.props.label}
            </button>
          );
        })}
      </div>
      
      <div className="mt-4">
        {tabs.map((tab, index) => (
          <div
            key={index}
            role="tabpanel"
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            hidden={index !== activeTab}
            className={index === activeTab ? 'block' : 'hidden'}
          >
            {tab.props.children}
          </div>
        ))}
      </div>
    </div>
  );
};

// Accessible Tab Item
export const AccessibleTab = ({ label, children }) => {
  return <div>{children}</div>;
};

// Screen Reader Only Text Component
export const ScreenReaderOnly = ({ children, as: Component = 'span' }) => {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
};

// Skip Link Component
export const SkipLink = ({ href = '#main-content', children = 'Skip to main content' }) => {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {children}
    </a>
  );
};

export default {
  AccessibleButton,
  AccessibleDropdown,
  AccessibleDropdownItem,
  AccessibleAlert,
  AccessibleAccordion,
  AccessibleAccordionItem,
  AccessibleTabs,
  AccessibleTab,
  ScreenReaderOnly,
  SkipLink,
};