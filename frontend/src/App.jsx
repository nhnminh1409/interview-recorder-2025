import { useState, useRef } from 'react';
import axios from 'axios';

const questions = ["Tell me about yourself", "Why this job?", "Your strength?", "Your weakness?", "Any questions?"];

function App() {
  const [step, setStep] = useState('login'); // login, interview, done
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [folder, setFolder] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [status, setStatus] = useState('');
  const videoRef = useRef(null);
  const recorderRef = useRef(null);
  const chunks = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    videoRef.current.srcObject = stream;
    recorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
    recorderRef.current.ondataavailable = e => chunks.current.push(e.data);
    recorderRef.current.start();
    setStatus('🔴 Recording...');
  };

  const stopAndUpload = async () => {
    recorderRef.current.stop();
    recorderRef.current.onstop = async () => {
      const blob = new Blob(chunks.current, { type: 'video/webm' });
      const form = new FormData();
      form.append('token', token);
      form.append('folder', folder);
      form.append('questionIndex', currentQ + 1);
      form.append('video', blob, `Q${currentQ + 1}.webm`);

      setStatus('⏳ Uploading...');
      try {
        await axios.post('http://localhost:5000/api/upload-one', form);
        setStatus('✅ Uploaded!');
        chunks.current = [];
        if (currentQ < questions.length - 1) {
          setCurrentQ(c => c + 1);
          setTimeout(startRecording, 1000);
        } else {
          await axios.post('http://localhost:5000/api/session/finish', { token, folder, questionsCount: questions.length });
          setStep('done');
        }
      } catch (e) {
        setStatus('❌ Upload failed - retry');
      }
    };
  };

  const startInterview = async () => {
    const res = await axios.post('http://localhost:5000/api/verify-token', { token });
    if (!res.data.ok) return alert('Token sai');
    const startRes = await axios.post('http://localhost:5000/api/session/start', { token, userName: name });
    setFolder(startRes.data.folder);
    setStep('interview');
    startRecording();
  };

  if (step === 'login') {
    return (
      <div style={{ padding: 50 }}>
        <h1>Web Interview Recorder</h1>
        <input placeholder="Token" value={token} onChange={e => setToken(e.target.value)} /><br/><br/>
        <input placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} /><br/><br/>
        <button onClick={startInterview}>Start Interview</button>
      </div>
    );
  }

  if (step === 'done') return <h1>Thank you! All done 🎉</h1>;

  return (
    <div style={{ padding: 50 }}>
      <h2>Question {currentQ + 1}/5</h2>
      <h3>{questions[currentQ]}</h3>
      <video ref={videoRef} autoPlay muted width={640} height={480} style={{ background: 'black' }} />
      <p>{status}</p>
      <button onClick={stopAndUpload} style={{ fontSize: 30, padding: '20px 40px' }}>
        {currentQ < questions.length - 1 ? 'Next →' : 'Finish'}
      </button>
    </div>
  );
}

export default App;