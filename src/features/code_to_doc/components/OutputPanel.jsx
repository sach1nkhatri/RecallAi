import React, { useMemo } from 'react';
import '../css/OutputPanel.css';

const basicMarkdownToHtml = (text) => {
  if (!text) return '<p class="ctd-empty-output">(No content generated yet)</p>';
  const lines = text.split(/\r?\n/);
  const html = [];
  let inList = false;
  let listType = '';
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      html.push('<br>');
      return;
    }
    
    if (/^####\s+/.test(trimmed)) {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      html.push(`<h4>${trimmed.replace(/^####\s+/, '')}</h4>`);
    } else if (/^###\s+/.test(trimmed)) {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      html.push(`<h3>${trimmed.replace(/^###\s+/, '')}</h3>`);
    } else if (/^##\s+/.test(trimmed)) {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      html.push(`<h2>${trimmed.replace(/^##\s+/, '')}</h2>`);
    } else if (/^#\s+/.test(trimmed)) {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      html.push(`<h1>${trimmed.replace(/^#\s+/, '')}</h1>`);
    } else if (/^(\d+\.)\s+/.test(trimmed)) {
      if (!inList || listType !== 'ol') {
        if (inList) html.push(`</${listType}>`);
        html.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      html.push(`<li>${trimmed.replace(/^\d+\.\s+/, '')}</li>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (!inList || listType !== 'ul') {
        if (inList) html.push(`</${listType}>`);
        html.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      html.push(`<li>${trimmed.replace(/^[-*]\s+/, '')}</li>`);
    } else {
      if (inList) {
        html.push(`</${listType}>`);
        inList = false;
      }
      // Handle inline code
      const processed = trimmed.replace(/`([^`]+)`/g, '<code>$1</code>');
      html.push(`<p>${processed}</p>`);
    }
  });
  
  if (inList) {
    html.push(`</${listType}>`);
  }
  
  return html.join('\n');
};

const OutputPanel = ({ output, pdfLink, pdfInfo, summary }) => {
  const renderedHtml = useMemo(() => basicMarkdownToHtml(output), [output]);

  return (
    <div className="ctd-output-panel">
      <div className="ctd-doc-wrap">
        <div
          className="doc-preview"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </div>
      <div className="ctd-actions">
        {pdfLink && (
          <a className="button link" href={pdfLink} download>
            Download PDF
          </a>
        )}
        {summary && (
          <div className="ctd-summary-info">{summary}</div>
        )}
        {pdfInfo && (
          <div className="ctd-pdf-info">{pdfInfo}</div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
