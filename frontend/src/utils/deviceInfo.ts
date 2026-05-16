function detectBrowser(userAgent) {
  if (userAgent.includes('Edg/')) {
    return 'Edge';
  }

  if (userAgent.includes('Chrome/')) {
    return 'Chrome';
  }

  if (userAgent.includes('Firefox/')) {
    return 'Firefox';
  }

  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    return 'Safari';
  }

  return 'Browser';
}

function detectOs(userAgent) {
  if (userAgent.includes('Windows')) {
    return 'Windows';
  }

  if (userAgent.includes('Mac OS X')) {
    return 'macOS';
  }

  if (userAgent.includes('Android')) {
    return 'Android';
  }

  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    return 'iOS';
  }

  if (userAgent.includes('Linux')) {
    return 'Linux';
  }

  return 'Unknown OS';
}

export function getCurrentDeviceInfo() {
  if (typeof navigator === 'undefined') {
    return 'Unknown device';
  }

  const userAgent = navigator.userAgent || '';
  const browser = detectBrowser(userAgent);
  const os = detectOs(userAgent);
  return `${browser} on ${os}`;
}
