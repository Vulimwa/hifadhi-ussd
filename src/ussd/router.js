const mongoose = require('mongoose');
const User = require('../models/User');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const Contact = require('../models/Contact');
const { v4: uuidv4 } = require('uuid');
const { cache } = require('./sessionCache');
const wards = require('../config/wards');
const WARDS = wards.WARDS || [];
console.log('Loaded wards:', WARDS);
const { t } = require('./i18n');

function normPhone(phone) {
  if (!phone) return '';
  let p = decodeURIComponent(phone).trim();
  if (p.startsWith('+')) return p;
  if (p.startsWith('0')) return '+254' + p.slice(1);
  if (p.startsWith('254')) return '+' + p;
  return '+' + p.replace(/[^0-9]/g, '');
}

function pickLang(user) {
  return user?.lang || process.env.DEFAULT_LANGUAGE || 'EN';
}

function resp(type, body) {
  // Ensure type is either CON or END
  const validType = type === 'CON' || type === 'END' ? type : 'END';
  // Ensure body is a string and not empty
  const validBody = String(body || 'Service error').trim();
  const response = `${validType} ${validBody}`;
  console.log('Sending USSD response:', response);
  return response;
}

function isAllowedSource(req) {
  // Always return true for testing
  return true;
}

async function ussdRouter(req, res) {
  // Set timeout to ensure we respond within Africa's Talking timeout limit
  res.setTimeout(15000, () => {
    console.error('Request timeout');
    res.send(resp('END', 'Request timeout. Please try again.'));
  });

  console.log('Incoming USSD request:', {
    body: req.body,
    headers: req.headers,
    ip: req.ip
  });

  // Validate required fields
  if (!req.body || !req.body.sessionId || !req.body.phoneNumber) {
    console.error('Missing required fields');
    return res.send(resp('END', 'Invalid request'));
  }

  const { sessionId, serviceCode, phoneNumber, text } = req.body;
  const sid = String(sessionId);
  const phone = normPhone(phoneNumber);
  const segs = String(text || '').split('*').filter(s => s !== '');
  
  console.log('Processing request:', { sid, phone, segs });

  try {
    // Fetch user (if any)
    let user = await User.findOne({ phone }).lean();
    const lang = pickLang(user);

    // Idempotency: if previously completed for this session, return last END
    const doneKey = `done:${sid}`;
    const done = cache.get(doneKey);
    if (done) return res.send(resp('END', done));

    // Root
    if (segs.length === 0) {
      return res.send(resp('CON', `${t(lang,'appTitle')}\n${t(lang,'root')}`));
    }

    console.log('Processing request with segments:', segs);
    const rootChoice = segs[0];
    switch (rootChoice) {
      case '0': {
        // Toggle language and persist
        const newLang = (lang === 'EN') ? 'SW' : 'EN';
        if (user) {
          await User.updateOne({ phone }, { $set: { lang: newLang } });
        } else {
          await User.updateOne({ phone }, { $setOnInsert: { phone }, $set: { lang: newLang } }, { upsert: true });
        }
        // Get translation function and call it with the new language
        const langToggledText = t(newLang,'langToggled')(newLang);
        return res.send(resp('CON', `${langToggledText}\n\n${t(newLang,'appTitle')}\n${t(newLang,'root')}`));
      }
      case '1': {
        // Registration flow
        // 1 -> name
        if (segs.length === 1) {
          return res.send(resp('CON', t(lang,'enterName')));
        }
        const name = segs[1].trim();
        if (segs.length === 2) {
          if (!name || name.length < 2) {
            return res.send(resp('CON', t(lang,'enterName')));
          }
          return res.send(resp('CON', t(lang,'selectWard', WARDS)));
        }
        const wardIdx = parseInt(segs[2], 10);
        const ward = WARDS[wardIdx - 1];
        if (segs.length === 3) {
          if (!ward) return res.send(resp('CON', t(lang,'selectWard', WARDS)));
          return res.send(resp('CON', t(lang,'enterVillage')));
        }
        const village = segs[3].trim();
        if (village.length > 24) return res.send(resp('CON', t(lang,'enterVillage')));
        if (segs.length === 4) {
          return res.send(resp('CON', t(lang,'regConfirm', { name, ward, village })));
        }
        const confirm = segs[4];
        if (confirm === '1') {
          try {
            console.log('Attempting registration with:', { phone, name, ward, village, lang });
            
            // Check if MongoDB is connected
            const dbConnection = await mongoose.connection;
            console.log('Database connection state:', dbConnection.readyState);
            
            // Create user document
            const userData = {
              phone,
              name,
              ward,
              village,
              lang,
              registeredAt: new Date()
            };
            console.log('Creating user with data:', userData);
            
            // Try to create or update the user
            const user = await User.findOneAndUpdate(
              { phone },
              { $set: userData },
              { upsert: true, new: true }
            );
            
            console.log('User created/updated:', user);
            
            const msg = t(lang,'regSuccess', user);
            cache.set(doneKey, msg);
            console.log('Registration successful for:', phone);
            return res.send(resp('END', msg));
          } catch (error) {
            console.error('Registration error:', error);
            return res.send(resp('END', 'Registration failed. Please try again.'));
          }
        } else {
          return res.send(resp('CON', t(lang,'enterName')));
        }
      }
      case '2': {
        // Report Incident
        // Steps: species -> urgency -> type -> ward? -> village -> note -> confirm -> save
        // 1) species
        if (segs.length === 1) {
          return res.send(resp('CON', t(lang,'incidentSpecies')));
        }
        const speciesMap = { '1': 'elephant', '2': 'buffalo', '3': 'lion', '4': 'other' };
        const urgencyMap = { '1': 'now', '2': 'today', '3': '24h' };
        const typeMap = { '1': 'crop', '2': 'livestock', '3': 'fence', '4': 'human' };

        const species = speciesMap[segs[1]];
        if (!species) return res.send(resp('CON', t(lang,'incidentSpecies')));
        if (segs.length === 2) {
          return res.send(resp('CON', t(lang,'incidentUrgency')));
        }
        const urgency = urgencyMap[segs[2]];
        if (!urgency) return res.send(resp('CON', t(lang,'incidentUrgency')));
        if (segs.length === 3) {
          return res.send(resp('CON', t(lang,'incidentType')));
        }
        const typ = typeMap[segs[3]];
        if (!typ) return res.send(resp('CON', t(lang,'incidentType')));

        let idx = 4;
        let ward = user?.ward;
        if (!ward) {
          if (segs.length === idx) {
            return res.send(resp('CON', t(lang,'askWard')(WARDS)));
          }
          const wIdx = parseInt(segs[idx], 10);
          ward = WARDS[wIdx - 1];
          if (!ward) return res.send(resp('CON', t(lang,'askWard')(WARDS)));
          idx += 1;
        }

        // Village: if user has one, ask use or edit
        let village = user?.village;
        if (village) {
          if (segs.length === idx) {
            return res.send(resp('CON', t(lang,'villageUseOrEdit')(village)));
          }
          const useOrEdit = segs[idx];
          if (useOrEdit === '1') {
            idx += 1;
          } else if (useOrEdit === '2') {
            // next segment should be village text
            if (segs.length === idx + 1) {
              return res.send(resp('CON', t(lang,'enterVillage')));
            }
            village = segs[idx + 1].trim();
            if (village.length > 24) return res.send(resp('CON', t(lang,'enterVillage')));
            idx += 2;
          } else {
            return res.send(resp('CON', t(lang,'villageUseOrEdit')(village)));
          }
        } else {
          if (segs.length === idx) {
            return res.send(resp('CON', t(lang,'enterVillage')));
          }
          village = segs[idx].trim();
          if (village.length > 24) return res.send(resp('CON', t(lang,'enterVillage')));
          idx += 1;
        }

        // Note optional
        let note = '';
        if (segs.length === idx) {
          return res.send(resp('CON', t(lang,'enterNote')));
        }
        const noteSeg = segs[idx];
        if (noteSeg !== '0') {
          note = (noteSeg || '').trim();
          if (note.length > 50) return res.send(resp('CON', t(lang,'enterNote')));
        }
        idx += 1;

        // Confirm
        const summary = t(lang,'confirmIncident')({ species, urgency, type: typ, ward, village });
        if (segs.length === idx) {
          return res.send(resp('CON', summary));
        }
        const submit = segs[idx];
        if (submit !== '1') {
          return res.send(resp('END', t(lang,'invalid')));
        }

        // Save incident
        const caseId = uuidv4();
        let userRef = null;
        try {
          const u = await User.findOneAndUpdate(
            { phone },
            { $setOnInsert: { phone }, $set: { ward, village } },
            { upsert: true, new: true }
          );
          userRef = u?._id;
        } catch (e) {}

        await Incident.create({ caseId, phone, userRef, species, urgency, type: typ, ward, village, note });
        const doneMsg = t(lang,'incidentSaved')(caseId);
        cache.set(doneKey, doneMsg);
        return res.send(resp('END', doneMsg));
      }
      case '3': {
        try {
          // Check Alerts
          let idx = 1;
          let ward = user?.ward;
          if (!ward) {
            if (segs.length === idx) {
              return res.send(resp('CON', t(lang,'askWard')(WARDS)));
            }
            const wIdx = parseInt(segs[idx], 10);
            ward = WARDS[wIdx - 1];
            if (!ward) return res.send(resp('CON', t(lang,'askWard')(WARDS)));
            idx += 1;
          }
          
          console.log('Checking alerts for ward:', ward);
          
          // Find alert with detailed logging
          const alert = await Alert.findOne({ ward }).lean();
          console.log('Found alert for ward:', ward, 'Alert data:', alert);
          
          const alertData = alert ? { 
            risk: alert.risk, 
            window: alert.window, 
            summary: lang === 'EN' ? alert.summaryEn : alert.summarySw 
          } : null;
          
          console.log('Alert data being sent to template:', alertData);
          const summary = t(lang,'alertsHeader')(alertData);
          
          if (segs.length === idx) {
            return res.send(resp('CON', `${summary}\n${t(lang,'alertsOptions')}`));
          }
          
          const choice = segs[idx];
          if (choice === '1') {
            console.log('SMS alert requested for:', { phone, ward });
            return res.send(resp('END', 'SMS will be sent.'));
          } else {
            return res.send(resp('CON', `${t(lang,'appTitle')}\n${t(lang,'root')}`));
          }
        } catch (error) {
          console.error('Alert check error:', error);
          return res.send(resp('END', t(lang,'error')));
        }
        if (segs.length === idx) {
          return res.send(resp('CON', `${summary}\n${t(lang,'alertsOptions')}`));
        }
        const choice = segs[idx];
        if (choice === '1') {
          // Optionally send SMS
          // Stub: log only for MVP
          console.log(JSON.stringify({ sms: 'alerts_summary', phone, ward }));
          return res.send(resp('END', 'SMS will be sent.'));
        } else {
          // Back to root
          return res.send(resp('CON', `${t(lang,'appTitle')}\n${t(lang,'root')}`));
        }
      }
      case '4': {
        // Prevention Tips
        if (segs.length === 1) {
          return res.send(resp('CON', t(lang,'tips')));
        }
        if (segs[1] === '1') {
          console.log(JSON.stringify({ sms: 'tips', phone }));
          return res.send(resp('END', 'SMS will be sent.'));
        }
        return res.send(resp('END', t(lang,'invalid')));
      }
      case '5': {
        // Emergency Contacts
        let idx = 1;
        let ward = user?.ward;
        if (!ward) {
          if (segs.length === idx) {
            return res.send(resp('CON', t(lang,'askWard')(WARDS)));
          }
          const wIdx = parseInt(segs[idx], 10);
          ward = WARDS[wIdx - 1];
          if (!ward) return res.send(resp('CON', t(lang,'askWard')(WARDS)));
          idx += 1;
        }
        const c = await Contact.findOne({ ward }).lean();
        const body = t(lang,'contacts')(c);
        if (segs.length === idx) {
          return res.send(resp('CON', body));
        }
        if (segs[idx] === '1') {
          console.log(JSON.stringify({ sms: 'contacts', phone, ward }));
          return res.send(resp('END', 'SMS will be sent.'));
        }
        return res.send(resp('END', t(lang,'invalid')));
      }
      default:
        return res.send(resp('END', t(lang,'invalid')));
    }
  } catch (err) {
    console.error('USSD error:', err);
    // Send a user-friendly error message
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Error: ${err.message}` 
      : 'Service error. Please try again.';
    return res.send(resp('END', errorMessage));
  }
}

module.exports = { ussdRouter };
