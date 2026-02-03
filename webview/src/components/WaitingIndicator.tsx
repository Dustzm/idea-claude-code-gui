import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { PermissionMode } from './ChatInputBox/types';

interface WaitingIndicatorProps {
  size?: number;
  /** 开始加载的时间戳（毫秒），用于在视图切换后保持计时连续 */
  startTime?: number;
  /** 当前权限模式，用于显示对应的颜色 */
  permissionMode?: PermissionMode;
}

export const WaitingIndicator = ({
  size = 20,
  startTime,
  permissionMode = 'bypassPermissions'
}: WaitingIndicatorProps) => {
  const { t } = useTranslation();

  // 获取随机文案（避免连续重复）
  const messagesRef = useRef<string[]>([]);
  const lastIndexRef = useRef<number>(-1);

  const getRandomMessage = useCallback(() => {
    if (messagesRef.current.length === 0) {
      messagesRef.current = t('chat.generatingMessages', { returnObjects: true }) as string[];
    }
    const messages = messagesRef.current;
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * messages.length);
    } while (newIndex === lastIndexRef.current && messages.length > 1);
    lastIndexRef.current = newIndex;
    return messages[newIndex];
  }, [t]);

  const [currentMessage, setCurrentMessage] = useState(() => getRandomMessage());
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [phase, setPhase] = useState<'typing' | 'waiting' | 'switching'>('typing');

  // 打字机效果 + 文案轮换
  useEffect(() => {
    if (phase === 'typing') {
      if (charIndex < currentMessage.length) {
        const timer = setTimeout(() => {
          setDisplayText(currentMessage.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, 50); // 打字速度 50ms/字符
        return () => clearTimeout(timer);
      } else {
        // 打字完成，隐藏光标，进入等待阶段
        setShowCursor(false);
        const waitTimer = setTimeout(() => setPhase('waiting'), 200);
        return () => clearTimeout(waitTimer);
      }
    } else if (phase === 'waiting') {
      // 等待 2.5 秒后切换到下一个文案
      const switchTimer = setTimeout(() => {
        setPhase('switching');
      }, 2500);
      return () => clearTimeout(switchTimer);
    } else if (phase === 'switching') {
      // 清除当前文字，切换文案，重新开始
      setDisplayText('');
      setCharIndex(0);
      setShowCursor(true);
      setCurrentMessage(getRandomMessage());
      setPhase('typing');
    }
  }, [charIndex, currentMessage, phase, getRandomMessage]);

  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    // 如果提供了开始时间，计算已经过去的秒数
    if (startTime) {
      return Math.floor((Date.now() - startTime) / 1000);
    }
    return 0;
  });

  // 计时器：记录当前思考轮次已经经过的秒数
  useEffect(() => {
    const timer = setInterval(() => {
      if (startTime) {
        // 使用外部传入的开始时间计算，避免视图切换后重置
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      } else {
        setElapsedSeconds(prev => prev + 1);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [startTime]);

  // 简短格式时间显示
  const formatTimeShort = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="waiting-indicator" data-mode={permissionMode}>
      <span className="waiting-spinner" style={{ width: size, height: size }}>
        <span className="pulse-ring" />
        <span className="pulse-ring pulse-ring-delay" />
        <span className="pulse-core" />
      </span>
      <span className="waiting-text">
        <span className="typewriter-text">{displayText}</span>
        {showCursor ? (
          <span className="typewriter-cursor">▋</span>
        ) : (
          <span className="typewriter-dots">...</span>
        )}
        <span className="waiting-timer"> · {formatTimeShort(elapsedSeconds)}</span>
      </span>
    </div>
  );
};

export default WaitingIndicator;
