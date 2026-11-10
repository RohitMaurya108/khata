const H = {
  "Khata":"खाता","Continue with Google":"Google से जारी रखें","New book":"नई बुक","Balance":"बैलेंस",
  "+ Cash in":"+ कैश इन","− Cash out":"− कैश आउट","Cash in":"कैश इन","Cash out":"कैश आउट",
  "Entries":"एंट्रियाँ","Report":"रिपोर्ट","Parties":"पार्टियाँ","Export CSV":"CSV निकालें","Download PDF":"PDF डाउनलोड",
  "Sign out":"साइन आउट","Admin":"एडमिन","Back to book":"बुक पर वापस","Delete":"हटाएँ","Cancel":"रद्द करें","Close":"बंद करें",
  "Save entry":"एंट्री सेव करें","This month":"इस महीने","Where money came from":"पैसा कहाँ से आया","Where money went":"पैसा कहाँ गया",
  "In":"आया","Out":"गया","Sales":"बिक्री","Payment received":"भुगतान मिला","Loan":"लोन","Other income":"अन्य आय",
  "Stock purchase":"माल खरीद","Rent":"किराया","Salary":"वेतन","Transport":"ढुलाई","Electricity":"बिजली","Food":"खाना","Other expense":"अन्य खर्च",
  "Cash":"नकद","UPI":"UPI","Bank":"बैंक","Amount (₹)":"राशि (₹)","Category":"श्रेणी","Paid by":"भुगतान का तरीका","Date":"तारीख",
  "Note (optional)":"नोट (वैकल्पिक)","Add party":"पार्टी जोड़ें","Save party":"पार्टी सेव करें","Name":"नाम","Type":"प्रकार",
  "Customer":"ग्राहक","Supplier":"सप्लायर","Settled":"हिसाब बराबर","Advance":"एडवांस","You’ll get":"आपको मिलेंगे","You’ll give":"आपको देने हैं",
  "Open":"खोलें","Add dues":"उधार जोड़ें","Record payment":"भुगतान दर्ज करें","Dues added":"उधार जुड़ा","Payment":"भुगतान",
  "Switch off":"बंद करें","Activate for 1 year":"1 साल के लिए चालू करें","Active until":"चालू, अंतिम तारीख","Waiting for access":"एक्सेस का इंतज़ार",
  "No entries yet. Tap Cash in or Cash out to add your first one.":"अभी कोई एंट्री नहीं। पहली एंट्री के लिए कैश इन या कैश आउट दबाएँ।",
  "No parties yet. Add a customer or supplier to track dues.":"अभी कोई पार्टी नहीं। उधार का हिसाब रखने के लिए ग्राहक या सप्लायर जोड़ें।",
  "Your business cashbook. Record cash in and cash out in two taps, then see where your money went.":"आपके business की कैशबुक। दो टैप में कैश इन और कैश आउट लिखें, और देखें पैसा कहाँ गया।",
  "Your account is waiting for access":"आपका अकाउंट एक्सेस का इंतज़ार कर रहा है",
  "Message us on WhatsApp after you pay, and we will switch your account on.":"भुगतान के बाद हमें WhatsApp करें, हम आपका अकाउंट चालू कर देंगे।",
  "Message on WhatsApp":"WhatsApp पर मैसेज करें","Loading":"लोड हो रहा है"
};
export const T = (lang) => (s) => (lang === "hi" && H[s]) || s;
Object.assign(H, {
  "Invoices":"इनवॉइस","Items":"आइटम","New invoice":"नया इनवॉइस","Add item":"आइटम जोड़ें","Edit":"बदलें","Low stock":"स्टॉक कम",
  "To receive":"मिलने हैं","To pay":"देने हैं","Paid":"चुकता","Due":"बाकी","Print":"प्रिंट","Receive payment":"भुगतान लें",
  "Business details":"बिज़नेस जानकारी","Backup":"बैकअप","Save":"सेव करें","Search":"खोजें","All":"सभी","Profit":"मुनाफ़ा","Income":"आमदनी","Expenses":"खर्च",
  "Remind on WhatsApp":"WhatsApp पर याद दिलाएँ","Phone":"फ़ोन","Save invoice":"इनवॉइस सेव करें","Add line":"लाइन जोड़ें","Total":"कुल",
  "Customer name":"ग्राहक का नाम","Customer GSTIN":"ग्राहक का GSTIN","Same state (CGST + SGST)":"एक ही राज्य (CGST + SGST)","Received now (₹)":"अभी मिले (₹)",
  "Quantity":"मात्रा","Rate":"दर","Item":"आइटम","Stock":"स्टॉक","Unit":"इकाई","Price":"कीमत","Min stock":"न्यूनतम स्टॉक","HSN code":"HSN कोड","Business name":"बिज़नेस का नाम","Address":"पता","From":"से","To":"तक"
});
