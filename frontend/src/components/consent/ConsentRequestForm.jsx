import React, { useState } from 'react';
import { FiSend, FiX, FiCalendar, FiUser, FiFileText } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ethers } from 'ethers';

// Editor
import { Editor } from 'react-draft-wysiwyg';
import { EditorState, ContentState, convertToRaw } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import htmlToDraft from 'html-to-draftjs';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

// Default consent template
const DEFAULT_CONSENT_TEMPLATE = `
<h2>Informed Consent for Biometric Data Collection</h2>

<p><strong>Study Title:</strong> [Study Title]</p>
<p><strong>Principal Investigator:</strong> [Researcher Name]</p>

<h3>Introduction</h3>
<p>You are being invited to participate in a research study involving the collection and analysis of biometric data. This document outlines the purpose of this study, what will be asked of you as a participant, and how your data will be used and protected.</p>

<h3>Purpose of the Study</h3>
<p>This study aims to [brief description of research goals]. Your biometric data will help us [explain benefit/purpose].</p>

<h3>Biometric Data Collection</h3>
<p>The following biometric data will be collected:</p>
<ul>
  <li>[Type of biometric data - e.g., fingerprints, retina scans, DNA samples]</li>
  <li>[Type of biometric data]</li>
  <li>[Type of biometric data]</li>
</ul>

<h3>Data Storage and Protection</h3>
<p>Your biometric data will be stored securely on a decentralized storage system with blockchain verification. This means:</p>
<ul>
  <li>Your data remains under your control at all times</li>
  <li>You can verify who has accessed your data and when</li>
  <li>You can revoke consent at any time</li>
  <li>All access attempts are recorded on an immutable ledger</li>
</ul>

<h3>Risks and Benefits</h3>
<p><strong>Potential Risks:</strong> [Description of any risks]</p>
<p><strong>Benefits:</strong> [Description of any benefits]</p>

<h3>Your Rights as a Participant</h3>
<p>Your participation is entirely voluntary. You have the right to:</p>
<ul>
  <li>Withdraw your consent at any time</li>
  <li>Request information about how your data is being used</li>
  <li>Request deletion of your data (subject to certain limitations)</li>
  <li>Receive a copy of your data</li>
</ul>

<h3>Contact Information</h3>
<p>If you have questions about this research, please contact [contact information].</p>
`;

function ConsentRequestForm({ onSubmit, onCancel, studyId }) {
  const [participant, setParticipant] = useState('');
  const [expirationDate, setExpirationDate] = useState(null);
  const [editorState, setEditorState] = useState(() => {
    const contentBlock = htmlToDraft(DEFAULT_CONSENT_TEMPLATE);
    const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
    return EditorState.createWithContent(contentState);
  });
  const [errors, setErrors] = useState({});

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    
    if (!participant || !ethers.utils.isAddress(participant)) {
      newErrors.participant = 'Please enter a valid Ethereum address';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Convert editor content to HTML
    const consentHtml = draftToHtml(convertToRaw(editorState.getCurrentContent()));
    
    // Create consent document object
    const consentDocument = {
      studyId,
      consentText: consentHtml,
      requestDate: new Date().toISOString(),
      expirationDate: expirationDate ? expirationDate.toISOString() : null,
      version: '1.0'
    };
    
    // Submit form
    onSubmit({
      participant,
      expirationDate: expirationDate ? expirationDate.toISOString() : null,
      consentDocument
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Participant Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Participant Address*
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiUser className="text-gray-400" />
          </div>
          <input
            type="text"
            className={`pl-10 block w-full border ${
              errors.participant ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            placeholder="0x..."
            value={participant}
            onChange={(e) => setParticipant(e.target.value)}
          />
        </div>
        {errors.participant && (
          <p className="mt-1 text-sm text-red-600">{errors.participant}</p>
        )}
      </div>
      
      {/* Expiration Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expiration Date (Optional)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiCalendar className="text-gray-400" />
          </div>
          <DatePicker
            selected={expirationDate}
            onChange={date => setExpirationDate(date)}
            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholderText="Select expiration date (optional)"
            minDate={new Date()}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          If not specified, consent will not expire automatically
        </p>
      </div>
      
      {/* Consent Document Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Consent Document
        </label>
        <div className="border border-gray-300 rounded-md overflow-hidden">
          <Editor
            editorState={editorState}
            onEditorStateChange={setEditorState}
            wrapperClassName="consent-editor-wrapper"
            editorClassName="consent-editor px-3 py-2 min-h-[300px]"
            toolbar={{
              options: ['inline', 'blockType', 'list', 'textAlign', 'link', 'history'],
              inline: {
                options: ['bold', 'italic', 'underline'],
              },
              blockType: {
                options: ['Normal', 'H1', 'H2', 'H3', 'H4'],
              },
              list: {
                options: ['unordered', 'ordered'],
              },
            }}
          />
        </div>
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          className="btn btn-outline"
          onClick={onCancel}
        >
          <FiX className="mr-1" />
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
        >
          <FiSend className="mr-1" />
          Send Request
        </button>
      </div>
    </form>
  );
}

export default ConsentRequestForm;