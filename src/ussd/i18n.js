const dict = {
  EN: {
    appTitle: 'HIFADHI LINK',
    root: '1. Register\n2. Report Incident\n3. Check Alerts\n4. Prevention Tips\n5. Emergency Contacts\n0. Language: EN | SW',
    back: '0) Back',
    enterName: 'Enter Full Name:',
    selectWard: (wards = [])=>`Select Ward:\n${(wards || []).map((w,i)=>`${i+1}. ${w}`).join('\n')}`,
    enterVillage: 'Enter Village (max 24 chars):',
    regConfirm: (u)=>`Confirm:\n${u.name}\n${u.ward}, ${u.village}\n1=Yes 2=Edit`,
    regSuccess: (u)=>`You’re registered in ${u.ward}, ${u.village}. Dial anytime for alerts. Stay safe.`,
    incidentSpecies: 'Species:\n1.Elephant 2.Buffalo 3.Lion 4.Other',
    incidentUrgency: 'Urgency:\n1.Now 2.Same day 3.Past 24h',
    incidentType: 'Type:\n1.Crop raid 2.Livestock 3.Fence/Boma 4.Human threat',
    askWard: (wards = [])=>`Select Ward:\n${(wards || []).map((w,i)=>`${i+1}. ${w}`).join('\n')}`,
    villageUseOrEdit: (v)=>`Village: ${v}\n1.Use 2.Edit`,
    enterNote: 'Optional note (<= 50 chars) or 0 to skip:',
    confirmIncident: (s)=>`Confirm\nSp:${s.species} Ur:${s.urgency} Ty:${s.type}\n${s.ward}, ${s.village}\n1=Submit 2=Cancel`,
    incidentSaved: (id)=>`Saved. Case ID: ${id}. We may contact you.`,
    alertsHeader: (a)=> a ? `Ward Risk: ${a.risk}. Window ${a.window}\n${a.summary}` : 'No alert for this ward.',
    alertsOptions: '1) SMS summary\n0) Back',
    tips: 'Tips:\n- Use chili briquettes\n- Night patrols in groups\n1) SMS me tips',
    contacts: (c)=> c ? `KWS: ${c.kwsHotline}\nWard Admin: ${c.wardAdmin}\n1) SMS me contacts` : 'No contacts found for ward.',
    langToggled: (l)=>`Language set to ${l}.`,
    invalid: 'Invalid choice. Try again.',
    tooLong: 'Too long. Try again.',
    error: 'Service issue. Please try later.'
  },
  SW: {
    appTitle: 'HIFADHI LINK',
    root: '1. Jisajili\n2. Ripoti Tukio\n3. Angalia Tahadhari\n4. Ushauri wa Kuzuia\n5. Mawasiliano ya Dharura\n0. Lugha: EN | SW',
    back: '0) Rudi',
    enterName: 'Weka Jina Kamili:',
    selectWard: (wards = [])=>`Chagua Wadi:\n${(wards || []).map((w,i)=>`${i+1}. ${w}`).join('\n')}`,
    enterVillage: 'Weka Kijiji (herufi 24):',
    regConfirm: (u)=>`Thibitisha:\n${u.name}\n${u.ward}, ${u.village}\n1=Ndio 2=Hariri`,
    regSuccess: (u)=>`Umesajiliwa ${u.ward}, ${u.village}. Kwa tahadhari, piga nambari hii wakati wowote.`,
    incidentSpecies: 'Mnyama:\n1.Ndovu 2.Ngombe Mwitu 3.Simba 4.Nyingine',
    incidentUrgency: 'Uharaka:\n1.Sasa 2.Leo 3.Saa 24 zilizopita',
    incidentType: 'Aina:\n1.Mashamba 2.Mifugo 3.Ukuta/Boma 4.Tishio kwa binadamu',
    askWard: (wards = [])=>`Chagua Wadi:\n${(wards || []).map((w,i)=>`${i+1}. ${w}`).join('\n')}`,
    villageUseOrEdit: (v)=>`Kijiji: ${v}\n1.Tumia 2.Hariri`,
    enterNote: 'Ujumbe hiari (<= 50) au 0 kuruka:',
    confirmIncident: (s)=>`Thibitisha\nSp:${s.species} Uh:${s.urgency} Ai:${s.type}\n${s.ward}, ${s.village}\n1=Tuma 2=Ghairi`,
    incidentSaved: (id)=>`Imesajiliwa. Nambari: ${id}.`,
    alertsHeader: (a)=> a ? `Hatari ya Wadi: ${a.risk}. Saa ${a.window}\n${a.summary}` : 'Hakuna tahadhari kwa wadi hii.',
    alertsOptions: '1) Nitumie SMS\n0) Rudi',
    tips: 'Ushauri:\n- Tumia mkaa wa pilipili\n- Doria za usiku kwa vikundi\n1) Nitumie SMS',
    contacts: (c)=> c ? `KWS: ${c.kwsHotline}\nAfisa Wadi: ${c.wardAdmin}\n1) Nitumie SMS` : 'Hakuna mawasiliano ya wadi.',
    langToggled: (l)=>`Lugha ${l} imehifadhiwa.`,
    invalid: 'Chaguo si sahihi. Jaribu tena.',
    tooLong: 'Ndefu mno. Jaribu tena.',
    error: 'Hitilafu ya huduma. Jaribu tena.'
  }
};

function t(lang, key, ...args) {
  const L = dict[lang] ? lang : (process.env.DEFAULT_LANGUAGE || 'EN');
  const val = dict[L][key];
  if (typeof val === 'function') return val(...args);
  return val;
}

module.exports = { t, dict };

