/**
 * SEO Component
 * Simple wrapper around useSEO hook for easy page-level SEO management
 */

import React from 'react';
import { useSEO } from './hooks/useSEO';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
}

export const SEO: React.FC<SEOProps> = (props) => {
  useSEO(props);
  return null; // This component doesn't render anything
};

export default SEO;