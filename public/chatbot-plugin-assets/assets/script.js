/* RVCE Chatbot v3 — Smart Engine with Content Moderation */
function startRVCEChatbot() {
'use strict';

let tone = 'pro';
let chatOpen = false;

/* =============== NLP TOKENIZER & PROCESSOR =============== */
const STOP_WORDS = new Set([
    // Only remove words that are 3+ letters and are NEVER department codes or keywords
    "what", "the", "can", "you", "tell", "about",
    "show", "give", "want", "know", "how", "does", "are",
    "for", "with", "but", "because", "curious", "whats", "info", "details", "pls", "plz", "urgent",
    "please", "hello", "hey", "sir", "madam", "could", "would", "should"
    // INTENTIONALLY EXCLUDED (are department codes or contextually meaningful):
    // "is" (ISE), "me" (Mechanical), "or" (used in phrases), "at", "in", "on", "an",
    // "a", "i", "do", "and", "so", "of", "to", "hi"
]);

function tokenize(text) {
    if (!text) return [];
    return text.toLowerCase()
               .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, ' ')
               .split(/\s+/)
               .filter(word => word.trim().length > 0);
}

function removeStopWords(tokens) {
    return tokens.filter(word => !STOP_WORDS.has(word));
}

function processNLPInput(input) {
    const tokens = tokenize(input);
    const cleanTokens = removeStopWords(tokens);
    return {
        tokens: cleanTokens,
        cleanString: cleanTokens.join(' ')
    };
}

/* =============== CONTENT MODERATION =============== */
const BLOCKED = {
    abusive: [
        'fuck','shit','ass','bitch','bastard','damn','dick','pussy','slut','whore',
        'stupid','idiot','dumb','moron','retard','crap','screw you','shut up','suck',
        'hate you','loser','trash','worthless','ugly','go to hell','kill','murder',
        'rape','abuse','harass','molest','stalk','threat','bomb','attack','terror',
        'drug','weed','cocaine','heroin','alcohol','drunk','smoke','gambling','porn',
        'sex','nude','naked','obscene','vulgar','profanity','racist','sexist','bigot',
        'ass hole','wtf','stfu','lmao','lmfao','bloody','madarchod','behenchod',
        'chutiya','bc','mc','gaand','saala','kamina','haramkhor','bewakoof','gadha','hack'
    ],
    conspiracy: [
        'illuminati','flat earth','reptilian','chemtrail','5g cause','qanon','deep state',
        'new world order','fake moon','area 51','aliens control','government mind control',
        'covid fake','vaccine microchip','bill gates chip','controlled demolition',
        'pizza gate','fake news media','rigged election','brainwash','propaganda',
        'freemason','secret society','population control','depopulation','mk ultra','political affiliation'
    ],
    private: [
        'student phone number','personal number','private email','home address',
        'student address','teacher address','salary of','faculty salary',
        'personal data','student marks','result of','cgpa of','gpa of',
        'marks of','percentage of','private detail','confidential','password',
        'bank detail','account number','aadhaar','pan card','dob of','date of birth of',
        'caste of','religion of','family of','father of','mother of','girlfriend',
        'boyfriend','relationship','married','wife of','husband of','someone\'s phone',
        'whatsapp number','instagram id','social media of','facebook of'
    ]
};

const SESSION = {
    lastIntent: null,
    history: [],
    navStack: [], // For back-navigation in nested flows
    pendingOverflows: [] // For retaining unanswered multiple questions
};

const PREFIXES = [
    "Sure thing!", "I can help with that!", "Got it!", "Great question.",
    "Here's what I found:", "Looking into that...", "Certainly!", "Happy to help."
];

function getPrefix() {
    return PREFIXES[Math.floor(Math.random() * PREFIXES.length)] + " ";
}

function checkModeration(input) {
    const lower = input.toLowerCase();
    
    // Helper to check for blocked pattern with word boundaries
    const isBlocked = (list) => {
        for (const word of list) {
            // Escape special chars and use word boundary (?:^|\s) and (?=\s|$) for broad match
            // or use \b if we want strict letter boundaries. 
            // Given "c.s.e" type sanitization, \b is generally safe for letters/numbers.
            const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp('(?:^|\\s)' + escaped + '(?=\\s|$|[?!.])', 'i');
            if (regex.test(lower)) return true;
        }
        return false;
    };

    if (isBlocked(BLOCKED.abusive)) return { blocked: true, type: 'abusive' };
    if (isBlocked(BLOCKED.conspiracy)) return { blocked: true, type: 'conspiracy' };
    if (isBlocked(BLOCKED.private)) return { blocked: true, type: 'private' };
    
    return { blocked: false };
}

function getModerationResponse(type) {
    const responses = {
        abusive: {
            funny: "Whoa there! 🚫 Let's keep it friendly, shall we? I'm here to help with RVCE stuff, not to trade insults! 😅",
            pro: "⚠️ I'm unable to respond to inappropriate or offensive language. Please keep our conversation respectful. I'm here to help you with genuine RVCE queries."
        },
        conspiracy: {
            funny: "Nice try! 🛸 But I only deal in verified RVCE facts, not conspiracy theories! Let's stick to something I can actually help with 😄",
            pro: "⚠️ I'm designed to provide factual information about RVCE only. I cannot engage with conspiracy theories or unverified claims. Please ask me about admissions, placements, or campus facilities."
        },
        private: {
            funny: "Sorry, that's classified! 🔒 I can't share anyone's private information. I'm a college chatbot, not a spy! 🕵️",
            pro: "⚠️ I cannot share personal or confidential information about students, faculty, or staff. This includes contact details, marks, or personal data. I can help with general college information instead."
        }
    };
    return responses[type][tone === 'funny' ? 'funny' : 'pro'];
}

/* =============== KNOWLEDGE BASE =============== */
const KB = {
    general: {
        name: "RV College of Engineering (RVCE)", est: "1963",
        campus: "16.85 acres on Mysuru Road, Bengaluru – 560 059",
        trust: "Rashtreeya Sikshana Samithi Trust (RSST)",
        status: "Autonomous (UG), Affiliated to VTU",
        accreditation: "NAAC A+ Grade (CGPA 3.39/4.0, valid 2024–2029), NBA Accredited (multiple UG & PG programs)",
        ranking: "NIRF 101-150 band (Engineering, 2025), #1 Private Engineering College in IIRF 2025",
        principal: "Dr. K.N. Subramanya",
        vicePrincipal: "Dr. K. S. Geetha",
        timings: "Mon-Fri: 9:00 AM – 4:45 PM, Sat: 9:00 AM – 1:00 PM",
        vision: "Leadership in quality technical education, interdisciplinary research & innovation, with focus on sustainable and inclusive technology.",
        intake: "2000+ students annually across UG and PG",
        research: "100+ Patents, ₹30+ Crores in grants, 20 Centres of Excellence, 15 VTU-recognized Research Centres",
        researchDomains: "AI, Quantum Tech, 5G, Electric Vehicles, Hydrogen Technology, IC Design",
        coes: [
            "Macroelectronics (CME)", "Macroelectronics (CME) - Thin Film Lab",
            "Internet of Things (IoT)", "Smart Antenna Systems (CSAS)",
            "Visual Computing", "Excellence in Materials & Manufacturing",
            "Robotics & Cognitive Systems", "Automotive Mechatronics (Mercedes Benz)",
            "Computational Genomics", "Quantum Computing (Q-RVCE)",
            "Cloud Computing & Big Data (HP)", "Advanced Manufacturing",
            "Smart Grid Technology", "Embedded Systems",
            "Data Science & AI", "IC Design & VLSI",
            "Electric Vehicle Technology", "Hydrogen & Fuel Cell Technology",
            "5G & Communication Systems", "Cyber Security",
            "Materials Fabrication and Characterization (CoE-MFC)",
            "Cognitive Intelligent Systems (CISSS)",
            "Logistics & Supply Chain Management",
            "AI Research (RVCE-BOSTON)",
            "Women in Cloud Centre of Excellence",
            "Sensor Technology Applications (CSTA)",
            "Nanomaterials and Devices (CND)",
            "Integrated Circuits and Systems (CoE-ICAS)",
            "Automotive Engineering (RV-Toyota)",
            "3S Infrastructure (Safe, Sustainable & Smart)",
            "Extended Reality Center (XR)",
            "Health Care Technology Research (CHTR)",
            "Wipro-IISc-RVCE EV Technology"
        ],
        cocs: [
            "Bosch Rexroth - Automation Tech", "Toyota - Automotive Tech",
            "Cisco - Networking", "HP - Cloud Computing",
            "5G and Emerging Wireless Technologies",
            "Electric Vehicle Tech (RVCE-MG)",
            "Smart Vidyuth & Sustainable Solutions",
            "Vision Astra in EV Academy",
            "Decibels RV Electric Vehicle"
        ],
        coes_detailed: [
            { n: "Materials Fabrication & Characterization (CoE-MFC)", i: "Advanced testing, characterization, and fabrication facilities (ECE)." },
            { n: "Cognitive Intelligent Systems (CISSS)", i: "In partnership with HPCC Systems, focuses on sustainable AI solutions (CSE)." },
            { n: "Internet of Things (Cisco-RVCE)", i: "Cisco-funded lab for advanced networking and IoT research (MCA)." },
            { n: "Computational Genomics", i: "Cutting-edge research at the intersection of BioTech and Computing." },
            { n: "Smart Antenna Systems (SASM)", i: "Features an Anechoic Chamber and EMI/EMC testing facilities (ECE)." },
            { n: "Quantum Information & Tech (CIRCUIT)", i: "Research in quantum computing and information theory (Physics)." },
            { n: "Hydrogen & Green Tech", i: "Collaborates with Dover India on clean energy and hydrogen materials (Chemical)." },
            { n: "Automotive Engineering (RV-Toyota)", i: "Focuses on engine technology and automotive systems (Mechanical)." },
            { n: "Extended Reality (XR) Center", i: "Specializes in VR/AR for education and industrial research (MCA)." },
            { n: "Integrated Circuits & Systems (CoE-ICAS)", i: "Advanced VLSI design and chip system research (ECE)." }
        ],
        /* === Comprehensive COE Database for specific COE search === */
        coes_db: [
            {
                id: 'coe_mfc',
                n: "Materials Fabrication & Characterization (CoE-MFC)",
                emoji: '🔬',
                dept: 'ECE',
                year: '2020-21',
                info: "Established in 2020-21, this CoE provides state-of-the-art advanced testing, characterization, and fabrication facilities. It focuses on semiconductor material analysis, thin-film deposition, nano-fabrication, and surface characterization to support cutting-edge electronics research.",
                url: 'https://rvce.edu.in/department/ece/the_centre_of_excellence_in_materials_fabrication_characterisation/',
                aliases: ['mfc','coe mfc','materials fabrication','materials characterization','materials fabrication characterization','coe-mfc','coemfc','fabrication lab','characterization lab']
            },
            {
                id: 'coe_cisss',
                n: "Cognitive Intelligent Systems for Sustainable Solutions (CISSS)",
                emoji: '🧠',
                dept: 'CSE',
                partner: 'HPCC Systems',
                info: "Established in partnership with HPCC Systems (LexisNexis), this CoE focuses on sustainable AI solutions using big data, machine learning, and cognitive computing. It supports research in intelligent data analytics, high-performance computing, and eco-friendly AI frameworks.",
                url: 'https://rvce.edu.in/department/cse/centre_of_excellence_in_rvce_hpcc_systems_cognitive_intelligent_systems_for_sustainable_solutionscisss/',
                aliases: ['cisss','hpcc','cognitive systems','cognitive intelligent','cisss coe','hpcc systems','lexisnexis','sustainable ai','coe cisss']
            },
            {
                id: 'coe_iot',
                n: "Internet of Things CoE (Cisco-RVCE)",
                emoji: '📡',
                dept: 'MCA',
                partner: 'Cisco',
                info: "Funded by Cisco, this IoT Centre of Excellence provides industry-standard networking equipment and IoT infrastructure. It supports research in smart systems, edge computing, and network automation, along with Cisco Networking Academy certification programs.",
                url: 'https://rvce.edu.in/department/mca/research/',
                aliases: ['iot coe','cisco iot','cisco rvce','internet of things coe','iot centre','networking coe','cisco coe','iot lab']
            },
            {
                id: 'coe_genomics',
                n: "Centre of Excellence in Computational Genomics",
                emoji: '🧬',
                dept: 'Biotechnology',
                info: "This CoE bridges Biotechnology and Computing, focusing on genomic data analysis, bioinformatics algorithms, proteomics, and computational biology. It enables multi-disciplinary research at the intersection of life sciences and engineering.",
                url: 'https://rvce.edu.in/department/biotechnology/centre-of-excellence-in-computational-genomics/',
                aliases: ['genomics','computational genomics','bioinformatics','genomics coe','biotech coe','coe genomics','proteomics','bio computing']
            },
            {
                id: 'coe_sasm',
                n: "Smart Antenna Systems (SASM)",
                emoji: '📡',
                dept: 'ECE',
                info: "This CoE features a cutting-edge Anechoic Chamber and EMI/EMC testing facilities. It focuses on antenna design, RF systems, electromagnetic compatibility testing, and smart/MIMO antenna research for 5G and beyond communications.",
                url: 'https://rvce.edu.in/department/ece/research/',
                aliases: ['sasm','smart antenna','antenna coe','anechoic','emi emc','rf systems','antenna systems','smart antenna systems','mimo antenna']
            },
            {
                id: 'coe_quantum',
                n: "Quantum Information & Technology (CIRCUIT)",
                emoji: '⚛️',
                dept: 'Physics',
                info: "The CIRCUIT (Centre for Information, Research, Computation, and Unification in Technology) CoE focuses on quantum computing algorithms, quantum information theory, quantum cryptography, and quantum hardware research. It is one of the few quantum-focused centres in Indian engineering colleges.",
                url: 'https://rvce.edu.in/department/physics/research/#',
                aliases: ['quantum','circuit coe','quantum computing','quantum information','quantum coe','quantum tech','quantum research','q-rvce','qrvce']
            },
            {
                id: 'coe_hydrogen',
                n: "Hydrogen & Green Technology CoE",
                emoji: '💧',
                dept: 'Chemical Engineering',
                partner: 'Dover India',
                info: "In collaboration with Dover India, this CoE researches clean hydrogen production, hydrogen fuel cells, green energy storage materials, and sustainable chemical processes. It supports India's hydrogen mission by developing expertise in next-gen clean energy technologies.",
                url: 'https://rvce.edu.in/department/chemical_engineering/ce_coe/',
                aliases: ['hydrogen','green tech','hydrogen coe','fuel cell','hydrogen fuel','clean energy coe','dover india','hydrogen technology','green energy coe','hydrogen green tech']
            },
            {
                id: 'coe_toyota',
                n: "Automotive Engineering CoE (RV-Toyota Kirloskar)",
                emoji: '🚗',
                dept: 'Mechanical Engineering',
                partner: 'Toyota Kirloskar',
                info: "Established with Toyota Kirloskar Motor, this CoE provides hands-on training in automotive engineering, engine technology, vehicle dynamics, and powertrain systems. Students gain industry-level exposure through Toyota's proprietary training modules and equipment.",
                url: 'https://rvce.edu.in/department/me/rv_toyota_kriloskar_centre_of_excellence_in_automotive_engineering/',
                aliases: ['toyota coe','rv toyota','automotive coe','toyota kirloskar','automotive engineering coe','engine technology coe','vehicle engineering coe']
            },
            {
                id: 'coe_xr',
                n: "Extended Reality Centre (XR Center)",
                emoji: '🥽',
                dept: 'MCA',
                info: "The XR Centre specializes in Virtual Reality (VR), Augmented Reality (AR), and Mixed Reality (MR) technologies. It supports research and development in immersive learning environments, industrial simulation, and next-generation human-computer interaction for both educational and industrial applications.",
                url: 'https://rvce.edu.in/department/mca/research/',
                aliases: ['xr center','xr centre','extended reality','virtual reality','augmented reality','mixed reality','vr ar coe','xr coe','vr coe','ar coe','immersive tech']
            },
            {
                id: 'coe_icas',
                n: "Integrated Circuits & Systems (CoE-ICAS)",
                emoji: '📟',
                dept: 'ECE',
                info: "The CoE-ICAS focuses on advanced VLSI chip design, system-on-chip (SoC) architectures, analog/mixed-signal circuit design, and embedded systems research. It bridges the gap between academic circuit design and industry-ready VLSI engineering.",
                url: 'https://rvce.edu.in/department/ece/centre_of_excellence_in_integrated_circuits_and_systemscoe_icas/',
                aliases: ['icas','coe icas','integrated circuits','vlsi coe','ic design coe','chip design','soc design','vlsi systems','coe-icas','icas coe']
            },
            {
                id: 'coe_3s',
                n: "3S Infrastructure CoE (Safe, Sustainable & Smart)",
                emoji: '🏗️',
                dept: 'Civil Engineering',
                info: "This CoE focuses on next-generation infrastructure research under three pillars: Safety (structural integrity and disaster resilience), Sustainability (eco-friendly construction materials and green buildings), and Smart (IoT-integrated smart infrastructure and transportation systems).",
                url: 'https://rvce.edu.in/department/civil_engineering/centre_of_excellence_in_3s_infrastructure_safe_sustainable_smart/',
                aliases: ['3s coe','3s infrastructure','safe sustainable smart','civil coe','smart infrastructure','sustainable infrastructure','structural coe','green building coe']
            },
            {
                id: 'coe_logistics',
                n: "Logistics & Supply Chain Management CoE",
                emoji: '🚚',
                dept: 'Industrial Engineering & Management',
                info: "This CoE researches optimization of supply chain operations, logistics network design, inventory management, Industry 4.0 integration, and data-driven decision-making in operations management. It has strong ties with logistics industry partners.",
                url: 'https://rvce.edu.in/department/iem/centre-of-excellence-in-logistics-supply-chain-management/',
                aliases: ['logistics coe','supply chain coe','iem coe','scm coe','logistics supply chain','supply chain management coe','operations coe','industrial engineering coe']
            },
            {
                id: 'coe_cav',
                n: "Connected & Autonomous Vehicles CoE",
                emoji: '🤖',
                dept: 'ECE',
                info: "Focuses on the research and development of connected vehicle systems, autonomous driving algorithms, V2X (vehicle-to-everything) communication, LiDAR-based sensing, and self-driving car technologies. A key research hub for the future of mobility.",
                url: 'https://rvce.edu.in/department/ece/centre_of_excellence_in_connected_autonomous_vehicles/',
                aliases: ['cav','autonomous vehicles','connected vehicles','self driving','lidar coe','autonomous car','v2x','vehicle coe','autonomous driving coe','coe cav']
            },
            {
                id: 'coe_ev',
                n: "Electric Vehicle Technology CoE (RVCE-MG Motor)",
                emoji: '⚡',
                dept: 'Mechanical Engineering',
                partner: 'MG Motor India',
                info: "In partnership with MG Motor India, this CoE focuses on electric vehicle powertrain design, battery management systems, EV motor control, charging infrastructure, and EV ecosystem research. Students work with industry-grade EV components and simulation tools.",
                url: 'https://rvce.edu.in/department/me/rvce_morris_garage_centre_of_excellence_in_electric_vehicle_technology_evt/',
                aliases: ['ev coe','electric vehicle coe','mg motor coe','ev technology','rvce mg','electric car coe','battery coe','ev powertrain','ev motor coe']
            },
            {
                id: 'coe_bosch',
                n: "RV-Bosch Rexroth Centre for Automation Technologies",
                emoji: '⚙️',
                dept: 'Mechanical Engineering',
                partner: 'Bosch Rexroth',
                info: "Established with Bosch Rexroth, this centre focuses on hydraulic automation, pneumatics, programmable logic controllers (PLC), industrial automation, and Industry 4.0 technologies. Students gain hands-on training with Bosch's industrial automation equipment.",
                url: 'https://rvce.edu.in/department/me/rv-bosch-rexroth-centre-for-automation-technologies/',
                aliases: ['bosch coe','bosch rexroth','automation coe','plc coe','hydraulics coe','industrial automation coe','rv bosch','bosch automation']
            },
            {
                id: 'coe_benz',
                n: "RV-Mercedes Benz Centre for Automotive Mechatronics (ADAM)",
                emoji: '🏎️',
                dept: 'Mechanical Engineering',
                partner: 'Mercedes-Benz',
                info: "The Mercedes-Benz Advanced Diploma in Automotive Mechatronics (ADAM) programme is a premium industry-academia collaboration offering specialization in mechatronic systems, automotive electronics, and luxury vehicle technology. Graduates receive a joint certification from RVCE and Mercedes-Benz.",
                url: 'https://rvce.edu.in/department/me/rv-mercedes-benz-centre-for-automotive-mechatronics/',
                aliases: ['benz','mercedes benz','mercedes-benz','benz coe','mercedes coe','adam','adam coe','mercedes benz coe','mechatronics coe','automotive mechatronics','rv mercedes','adam programme','mercedes benz centre']
            },
            {
                id: 'coe_wic',
                n: "Women in Cloud Centre of Excellence",
                emoji: '☁️',
                dept: 'Information Science & Engineering',
                partner: 'Women in Cloud',
                info: "Established in partnership with Women in Cloud, this CoE promotes gender diversity in technology and cloud computing. It provides training in cloud platforms, AI, and digital skills with a special focus on empowering women in STEM fields through certification programs and industry mentorship.",
                url: 'https://rvce.edu.in/department/ise/ise_coe/',
                aliases: ['women in cloud','wic coe','cloud coe','ise coe','women cloud coe','gender diversity tech','cloud computing coe']
            },
            {
                id: 'coe_sensor',
                n: "Sensor Technology Applications CoE (CSTA)",
                emoji: '📡',
                dept: 'Electronics & Instrumentation (EIE)',
                info: "CSTA focuses on the design and application of advanced sensor systems for industrial, biomedical, and environmental monitoring. Research areas include MEMS sensors, wireless sensor networks, IoT-integrated sensing, and precision instrumentation.",
                url: 'https://rvce.edu.in/department/eim/eie_centre_of_excellence_in_sensor_technology_applications/',
                aliases: ['sensor coe','csta','sensor technology','eie coe','sensor applications','mems coe','sensor research','instrumentation coe']
            },
            {
                id: 'coe_health',
                n: "Health Care Technology Research CoE (CHTR)",
                emoji: '🏥',
                dept: 'Electronics & Instrumentation (EIE)',
                info: "CHTR focuses on biomedical engineering, health monitoring devices, telemedicine systems, wearable health tech, and AI-driven diagnostic tools. It bridges electronics engineering and healthcare to develop impactful medical technology innovations.",
                url: 'https://rvce.edu.in/department/eim/eie_centre_of_excellence_in_health_care_technology_research/',
                aliases: ['health coe','chtr','healthcare tech coe','biomedical coe','health care technology','medical tech coe','health research coe','wearable tech coe']
            },
            {
                id: 'coe_5g',
                n: "5G & Emerging Wireless Technologies CoE",
                emoji: '📶',
                dept: 'Electronics & Telecom (ETE)',
                info: "This CoE focuses on 5G NR standards, millimeter-wave communications, network slicing, massive MIMO, edge computing for 5G, and next-generation wireless protocols. It prepares students for the telecom industry's transition to 5G and beyond (B5G/6G research).",
                url: 'https://rvce.edu.in/wp-content/uploads/2025/11/5G-AND-EMERGING-WIRELESS-TECHNOLOGIES.pdf',
                aliases: ['5g coe','5g wireless','telecom coe','etc coe','wireless coe','mmwave coe','5g nr','beyond 5g','6g coe','5g emerging']
            },
            {
                id: 'coe_mobility',
                n: "e-Mobility & Smart Grid Technology CoE (EEE)",
                emoji: '🔋',
                dept: 'Electrical & Electronics (EEE)',
                info: "This CoE focuses on electric mobility systems, smart grid technology, power electronics for EV applications, renewable energy integration, and energy storage systems. It supports research in next-generation electrical infrastructure for sustainable transportation and power systems.",
                url: 'https://rvce.edu.in/department/eee/eee_coe/',
                aliases: ['mobility coe','smart grid','eee coe','emobility','e-mobility coe','smart grid coe','power electronics coe','energy storage coe','electrical coe']
            },
            {
                id: 'coe_boston',
                n: "RVCE-Boston AI Research CoE",
                emoji: '🧠',
                dept: 'CSE / Multi-Department',
                partner: 'Boston Ltd., UK (Graphcore)',
                info: "One of the most powerful AI research centres in Indian academia, built with Boston Ltd., UK. Features a Graphcore POD4 server delivering 1-PetaFLOP of AI computing power. Research focus areas include Computer Vision, FinTech AI, AgriTech, BioTech, and MLOps. Offers a 6-month professional certification in Data Science & MLOps.",
                url: 'https://rvce.edu.in/department/wp-content/uploads/2026/03/RVCE-Boston-AI-CoE2.pdf',
                aliases: ['boston ai','rvce boston','boston coe','graphcore','petaflop','ai research coe','boston uk','mlops coe','computer vision coe','boston ai coe']
            }
        ],
        industryPartners: ["Google", "Microsoft", "Toyota", "Mercedes Benz", "Cisco", "IBM", "Intel", "Honeywell", "Bosch", "Amazon", "Adobe", "Samsung", "Tata Technologies", "Boeing", "Wipro", "MG Motor"],
        collaborations: [
            { n: "Tata Technologies", i: "CIIIT (Center for Invention, Innovation, Incubation & Training) focuses on Industry 4.0 and Smart Manufacturing (₹60 Cr project)." },
            { n: "Cisco", i: "Cisco Networking Academy and IoT CoE for advanced digital training." },
            { n: "MG Motor India", i: "EV Tech CoC for electric vehicle skill development." },
            { n: "Bosch Rexroth", i: "Automation Technology and Hydraulics training centre." },
            { n: "IBM", i: "IBM Centre of Excellence for software and cloud training." },
            { n: "Mercedes-Benz", i: "Advanced Diploma in Automotive Mechatronics (ADAM)." },
            { n: "Toyota", i: "Automotive Engineering and engine technology training centre." },
            { n: "Samsung", i: "PRISM program for industry-academic collaboration on research projects." }
        ],
        foodCourt: {
            name: "Cafe Mingos (Main Food Court)",
            capacity: "1000+ students",
            timings: "9:00 AM – 4:30 PM",
            cuisines: "North Indian, South Indian, Chinese, Fast Food (Burgers, Sandwiches, Chats)",
            features: "Two floors, 500 sq.m area, steam-cooked hygienic food, self-service model",
            outlets: ["Main Food Court (Cafe Mingos)", "Mini Canteen", "Extension Food Court Counter"],
            others: "The food court is a hub for social interaction and quick meals; Hostel messes are strictly vegetarian."
        }
    },
    contact: {
        address: "RV College of Engineering, RV Vidyanikethan Post, Mysuru Road, Bengaluru – 560 059",
        maps: "https://maps.google.com/?q=RV+College+of+Engineering+Bengaluru",
        phone: "+91-080-68188112 / 8111", admissionPhone: "080-68188147/48/49",
        email: "mailto:principal@rvce.edu.in", vicePrincipalEmail: "mailto:viceprincipal@rvce.edu.in", placementPhone: "9886130504",
        website: "https://rvce.edu.in/",
        social: {
            facebook: "https://www.facebook.com/RVCEngineering/",
            instagram: "https://www.instagram.com/rvcollegeofengineering/",
            linkedin: "https://www.linkedin.com/school/rvcengineering/",
            x: "https://x.com/rvce_official"
        }
    },
    rvei: {
        history: "Founded in 1940 by Sri M. C. Shivananda Sarma and Sri Meda Kasturi Ranga Setty.",
        institutions: "Manages over 25 institutions including RV College of Engineering, RV University, NMKRV College, DAPM RV Dental College, and RV Institute of Management.",
        motto: "Excellence in Education with Societal Commitment."
    },
    placements: {
        companies: "192+ companies participated (2026 Drive - Ongoing)", avgSalary: "₹16.86 LPA (2026 Avg)",
        maxSalary: "₹67 LPA Highest Package (2026 Batch)", recruiters: "Microsoft, Google, Amazon, Atlassian, Cisco, Dell, Intel, Adobe, Flipkart, Samsung, PayPal, IBM, Deloitte, JP Morgan, Goldman Sachs, Bosch, Mercedes-Benz",
        scholarships: "₹72+ Lakhs awarded annually from ABB, Boeing, CTS",
        infra: "800+ systems, seminar halls, 6 interview rooms, 2 GD rooms",
        offers: "698+ offers made so far",
        url: "https://rvce.edu.in/placement_and_training/",
        prev2025: { maxSalary: "₹67 LPA", companies: "262", offers: "922 offers" }
    },
    admissions: {
        ug: { eligibility: "12th/2nd PUC with min 45% in Physics + Maths + Chemistry/Biotech/Biology/CS/Electronics (40% for SC/ST/OBC Karnataka)", exams: "KCET (KEA), COMED-K, Management Quota. JEE Mains is NOT considered.", quotas: "Also available: CIWG/PIO/OCI/Nepal Citizens quota" },
        pg: { eligibility: "B.E./B.Tech with min 50% marks (45% for SC/ST/OBC Karnataka)", exams: "Valid GATE or PGCET score" },
        mca: { eligibility: "Bachelor's degree with min 50% marks (45% for SC/ST/OBC Karnataka)" },
        phd: { info: "Doctoral programs in all departments via entrance test + interview. 15 VTU-recognized Research Centres." },
        fees: "Management Quota B.E. fees range from ~₹16 Lakhs to ~₹70 Lakhs total over 4 years (e.g., CSE highest at ~₹70L, Core branches ~₹16L-₹24L). M.Tech/MCA ranges from ₹2L to ₹16L.",
        cutoffs: "Official KCET cutoffs are released by KEA (e.g., ISE cutoff was ~832 in 2023).",
        url: "https://rvce.edu.in/admissions/"
    },
    departments: {
        ug: [
            {
                n:"Aerospace Engineering (AE)",
                c:"ae", 
                u:"https://rvce.edu.in/department/ae/department-of-aerospace-engineering/",
                intake: "60",
                accreditation: "NBA Accredited", 
                hod:"Dr. R Supreeth",
                hod_url: "https://rvce.edu.in/department/ae/dr_r_supreeth/",
                info: "Welcome to the Department of Aerospace Engineering. Established in 2015, the Department has evolved into one of the country’s most prestigious destinations for undergraduate Aerospace Programmes.",
                about: "https://rvce.edu.in/department/ae/about_dept/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/ae/faculty/",
                research: "https://rvce.edu.in/department/ae/research/",
                placement: "https://rvce.edu.in/department/ae/placement/",
                labs: "https://rvce.edu.in/department/ae/laboratories/",
                facilities: "https://rvce.edu.in/department/ae/facilities/",
                campus_diaries: "https://rvce.edu.in/department/ae/campus_diaries/",
                hod_message: "https://rvce.edu.in/department/ae/dr_r_supreeth_hod_message/"
            },
            {
                n:"AI & Machine Learning (AIML)",
                c:"aiml", 
                u:"https://rvce.edu.in/department/ai_ml/main_department/",
                intake: "180",
                accreditation: "Not specified/New", 
                hod:"Dr. Deepamala N (Program Coordinator)",
                hod_url: "https://rvce.edu.in/department/cse/dr_deepamala_n/",
                info: "Established in 2021, the programme builds a strong foundation in computer science engineering with focused training in Artificial Intelligence, Machine Learning, Deep Learning, and Data Science.",
                about: "https://rvce.edu.in/department/ai_ml/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/ai_ml/faculty/",
                placement: "https://rvce.edu.in/department/ai_ml/placement/",
                labs: "https://rvce.edu.in/department/ai_ml/laboratories/",
                facilities: "https://rvce.edu.in/department/ai_ml/facilities/",
                research: "https://rvce.edu.in/department/ai_ml/research/",
                campus_diaries: "https://rvce.edu.in/department/ai_ml/campus_diaries/",
                hod_message: "",
                academic_planning: "https://rvce.edu.in/department/ai_ml/academic_planning/",
                collab: "https://rvce.edu.in/department/ai_ml/collaboration-and-networking/"
            },
            {
                n:"Biotechnology (BT)",
                c:"bt", 
                u:"https://rvce.edu.in/department/biotechnology/department_of_biotechnology/",
                intake: "60",
                accreditation: "NBA Accredited", 
                hod:"Dr. Nagashree N Rao",
                info: "At the crossroads of science and innovation, the Department of Biotechnology (est. 2002) blends theoretical knowledge with practical experience, offering B.E., M.Tech., and Ph.D. programmes with advanced research facilities.",
                about: "https://rvce.edu.in/department/biotechnology/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/biotechnology/faculty/",
                placement: "https://rvce.edu.in/department/biotechnology/placement/",
                labs: "https://rvce.edu.in/department/biotechnology/laboratories/",
                facilities: "https://rvce.edu.in/department/biotechnology/facilities/",
                research: "https://rvce.edu.in/department/biotechnology/research/",
                hod_message: "https://rvce.edu.in/department/biotechnology/message_from_hod_biotechnology/",
                happenings: "https://rvce.edu.in/department/biotechnology/happenings/",
                academic_planning: "https://rvce.edu.in/department/biotechnology/acadamic_planning/",
                m_tech: "https://rvce.edu.in/department/biotechnology/m_tech_in_biotechnology/",
                coe_genomics: "https://rvce.edu.in/department/biotechnology/centre-of-excellence-in-computational-genomics/"
            },
            {
                n:"Chemical Engineering (CH)",
                c:"ch", 
                u:"https://rvce.edu.in/department/chemical_engineering/main_dept/",
                intake: "40",
                accreditation: "NBA Accredited", 
                hod:"Dr. Jagadish H Patil",
                info: "Established in 1982, the Department of Chemical Engineering is a leader in academic and research excellence, holding a 6-year NBA accreditation. It offers B.E., M.Sc. (Engg) by Research, and Ph.D. programmes.",
                about: "https://rvce.edu.in/department/chemical_engineering/about_dept/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "http://rvce.edu.in/department/chemical_engineering/faculty/",
                placement: "https://rvce.edu.in/department/chemical_engineering/placement/",
                labs: "https://rvce.edu.in/department/chemical_engineering/laboratories/",
                research: "https://rvce.edu.in/department/chemical_engineering/research/",
                facilities: "https://rvce.edu.in/department/chemical_engineering/facilities/",
                project_labs: "https://rvce.edu.in/department/chemical_engineering/project_labs/",
                campus_diaries: "https://rvce.edu.in/department/chemical_engineering/campus_diaries/",
                hod_message: "https://rvce.edu.in/department/chemical_engineering/dr_jagadish_h_patil_hod_message/",
                coe_hydrogen: "https://rvce.edu.in/department/chemical_engineering/ce_coe/"
            },
            {
                n:"Chemistry (CHY)",
                c:"chy", 
                u:"https://rvce.edu.in/department/chemistry/department_of_chemistry/", 
                hod:"Dr. Mahesh R",
                info: "Established in 1963, the Department of Chemistry provides foundational knowledge to all first-year engineering students and offers global electives. It is a recognized VTU research centre.",
                about: "https://rvce.edu.in/department/chemistry/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/chemistry/faculty/",
                labs: "https://rvce.edu.in/department/chemistry/laboratories/",
                research: "https://rvce.edu.in/department/chemistry/research/",
                facilities: "https://rvce.edu.in/department/chemistry/facilities/",
                happenings: "https://rvce.edu.in/department/chemistry/happenings/",
                hod_message: "https://rvce.edu.in/department/chemistry/message_from_hod_basic_chemistry/",
                collab: "https://rvce.edu.in/department/chemistry/collaboration-and-networking/"
            },
            {
                n:"Civil Engineering (CV)",
                c:"cv", 
                u:"https://rvce.edu.in/department/civil_engineering/department-of-civil-engineering/",
                intake: "60",
                accreditation: "NBA Accredited", 
                hod:"Dr. Anjaneyappa",
                info: "Established in 1963, the department offers NBA-accredited B.E. in Civil Engineering and M.Tech in Structural Engineering & Highway Technology. It is a recognized VTU research centre.",
                about: "https://rvce.edu.in/department/civil_engineering/about-the-department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/civil_engineering/faculty/",
                placement: "https://rvce.edu.in/department/civil_engineering/placement/",
                labs: "https://rvce.edu.in/department/civil_engineering/civil-laboratories/",
                research: "https://rvce.edu.in/department/civil_engineering/research/",
                facilities: "https://rvce.edu.in/department/civil_engineering/facilities/",
                coe_3s: "https://rvce.edu.in/department/civil_engineering/centre_of_excellence_in_3s_infrastructure_safe_sustainable_smart/",
                m_tech_structural: "https://rvce.edu.in/department/civil_engineering/mtech_in_structural_engineering/",
                m_tech_highway: "https://rvce.edu.in/department/civil_engineering/mtech_in_highway_technology/",
                collab: "https://rvce.edu.in/department/civil_engineering/collaboration-and-networking/"
            },
            {
                n:"Computer Science & Engg (CSE)",
                c:"cs", 
                u:"https://rvce.edu.in/department/cse/cse_main/",
                intake: "360",
                accreditation: "NBA Accredited", 
                hod:"Dr. Shanta Rangaswamy",
                info: "Established in 1984, the CSE department is the most sought-after at RVCE. It offers NBA-accredited B.E., M.Tech. (CSE and CNE), and Ph.D. programs with state-of-the-art labs and stellar placements.",
                about: "https://rvce.edu.in/department/cse/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/cse/faculty/",
                placement: "https://rvce.edu.in/department/cse/placement/",
                labs: "https://rvce.edu.in/department/cse/laboratories/",
                research: "https://rvce.edu.in/department/cse/research/",
                facilities: "https://rvce.edu.in/department/cse/facilities/",
                happenings: "https://rvce.edu.in/department/cse/happenings/",
                hod_message: "https://rvce.edu.in/department/cse/dr_shanta_rangaswamy_hod_message/",
                coe_cisss: "https://rvce.edu.in/department/cse/centre_of_excellence_in_rvce_hpcc_systems_cognitive_intelligent_systems_for_sustainable_solutionscisss/",
                coe_vision: "https://rvce.edu.in/department/cse/centre_of_excellence_in_computer_vision_research_next_generation_ai_enabled/",
                m_tech: "https://rvce.edu.in/department/cse/m_tech_cse/",
                m_tech_cne: "https://rvce.edu.in/department/cse/m_tech_cne/",
                collab: "https://rvce.edu.in/department/cse/collaboration-and-networking/"
            },
            {
                n:"CSE (AI & ML) (CSAIML)",
                c:"csaiml", 
                u:"https://rvce.edu.in/department/cse/cse_main/",
                intake: "180",
                accreditation: "Not specified/New", 
                hod:"Dr. Shanta Rangaswamy (Under CSE Dept)",
                info: "A specialized B.E. track under the CSE department focusing on Artificial Intelligence and Machine Learning.",
                about: "https://rvce.edu.in/department/cse/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/cse/faculty/",
                placement: "https://rvce.edu.in/department/cse/placement/",
                labs: "https://rvce.edu.in/department/cse/laboratories/"
            },
            {
                n:"CSE (Cyber Security) (CSCY)",
                c:"cscy", 
                u:"https://rvce.edu.in/department/cse/cse_main/",
                intake: "60",
                accreditation: "Not specified/New", 
                hod:"Dr. Shanta Rangaswamy (Under CSE Dept)",
                info: "A specialized B.E. track under the CSE department focusing on Cyber Security and defensive computing.",
                about: "https://rvce.edu.in/department/cse/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/cse/faculty/",
                placement: "https://rvce.edu.in/department/cse/placement/",
                labs: "https://rvce.edu.in/department/cse/laboratories/"
            },
            {
                n:"CSE (Data Science) (CSDS)",
                c:"csds", 
                u:"https://rvce.edu.in/department/cse/cse_main/",
                intake: "60",
                accreditation: "Not specified/New", 
                hod:"Dr. Shanta Rangaswamy (Under CSE Dept)",
                info: "A specialized B.E. track under the CSE department focusing on Data Science, Big Data, and Analytics.",
                about: "https://rvce.edu.in/department/cse/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/cse/faculty/",
                placement: "https://rvce.edu.in/department/cse/placement/",
                labs: "https://rvce.edu.in/department/cse/laboratories/"
            },
            {
                n:"Electrical & Electronics (EEE)",
                c:"ee", 
                u:"https://rvce.edu.in/department/eee/department-of-electrical-and-electronics-engineering/",
                intake: "60",
                accreditation: "NBA Accredited", 
                hod:"Dr. J N Hemalatha (I/c)",
                info: "Since 1963, the EEE department has been a hub of academic excellence. It offers B.E. and M.Tech in Power Electronics, focusing on renewable energy, smart grids, and industrial automation.",
                about: "https://rvce.edu.in/department/eee/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/eee/faculty/",
                placement: "https://rvce.edu.in/department/eee/placement/",
                labs: "https://rvce.edu.in/department/eee/laboratories/",
                research: "https://rvce.edu.in/department/eee/research/",
                facilities: "https://rvce.edu.in/department/eee/facilities/",
                campus_diaries: "https://rvce.edu.in/department/eee/campus_diaries/",
                hod_message: "https://rvce.edu.in/department/eee/hod_message/",
                rd_labs: "https://rvce.edu.in/department/eee/rd_labs/",
                m_tech: "https://rvce.edu.in/department/eee/mtech_in_power_electronics/",
                coe_mobility: "https://rvce.edu.in/department/eee/eee_coe/",
                coe_vidyuth: "https://rvce.edu.in/wp-content/uploads/2025/11/SMART-VIDYUTH-SUSTAINABLE-SOLUTIONS.pdf",
                coc_ev: "https://rvce.edu.in/department/eee/coc_vision_astra_in_ev_academy/"
            },
            {
                n:"Electronics & Communication (ECE)",
                c:"ec", 
                u:"https://rvce.edu.in/department/ece/department_of_electronics_and_communication/",
                intake: "240",
                accreditation: "NBA Accredited", 
                hod:"Dr. H. V. Ravish Aradhya",
                info: "Established in 1972, the department offers state-of-the-art degrees with a 6-year NBA accreditation (2022-2028) and hosts multiple Centres of Excellence in VLSI, Autonomous Vehicles, and Materials Fabrication.",
                about: "https://rvce.edu.in/department/ece/about_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/ece/faculty/",
                placement: "https://rvce.edu.in/department/ece/placement/",
                labs: "https://rvce.edu.in/department/ece/laboratories/",
                research: "https://rvce.edu.in/department/ece/research/",
                rd_labs: "https://rvce.edu.in/department/ece/randd-lab/",
                facilities: "https://rvce.edu.in/department/ece/facilities/",
                happenings: "https://rvce.edu.in/department/ece/happenings/",
                hod_message: "https://rvce.edu.in/department/ece/hod_message/",
                coe_mfc: "https://rvce.edu.in/department/ece/the_centre_of_excellence_in_materials_fabrication_characterisation/",
                coe_cav: "https://rvce.edu.in/department/ece/centre_of_excellence_in_connected_autonomous_vehicles/",
                coe_icas: "https://rvce.edu.in/department/ece/centre_of_excellence_in_integrated_circuits_and_systemscoe_icas/",
                m_tech_vlsi: "https://rvce.edu.in/department/ece/m_tech_in_vlsi_design_embedded_systems/",
                m_tech_comm: "https://rvce.edu.in/department/ece/master_of_technology_in_m_tech_communication_systems/",
                collab: "https://rvce.edu.in/department/ece/collaboration-and-networking/"
            },
            {
                n:"Electronics & Instrumentation (EIE)",
                c:"ei", 
                u:"https://rvce.edu.in/department/eim/main_dept/",
                intake: "60",
                accreditation: "NBA Accredited", 
                hod:"Dr. CH. Renumadhavi",
                info: "Established in 1981, the department offers an NBA-accredited curriculum that is regularly updated to meet industry demands, featuring modern laboratories for hands-on learning and innovation in automation and control.",
                about: "https://rvce.edu.in/department/eim/about_dept/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/eim/faculty/",
                placement: "https://rvce.edu.in/department/eim/placement/",
                labs: "https://rvce.edu.in/department/eim/laboratories/",
                research: "https://rvce.edu.in/department/eim/research/",
                rd_labs: "https://rvce.edu.in/department/eim/rd/",
                campus_diaries: "https://rvce.edu.in/department/eim/campus_diaries/",
                hod_message: "https://rvce.edu.in/department/eim/hod_message/",
                publications: "https://rvce.edu.in/department/eim/publications/",
                coe_sensor: "https://rvce.edu.in/department/eim/eie_centre_of_excellence_in_sensor_technology_applications/",
                coe_health: "https://rvce.edu.in/department/eim/eie_centre_of_excellence_in_health_care_technology_research/"
            },
            {
                n:"Electronics & Telecom (ETE)",
                c:"et", 
                u:"https://rvce.edu.in/department/etc/main_department/",
                intake: "60",
                accreditation: "NBA Accredited", 
                hod:"Dr. Nagamani K",
                info: "Established in 1992, the department offers a comprehensive educational experience emphasizing hands-on design in hardware, software, embedded systems, networks, and protocols.",
                about: "https://rvce.edu.in/department/etc/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "http://rvce.edu.in/department/etc/faculty/",
                placement: "https://rvce.edu.in/department/etc/placement/",
                labs: "https://rvce.edu.in/department/etc/laboratories/",
                research: "https://rvce.edu.in/department/etc/research/",
                rd_labs: "https://rvce.edu.in/department/etc/rd_labs/",
                facilities: "https://rvce.edu.in/department/etc/facilities/",
                project_labs: "https://rvce.edu.in/department/etc/project_lab/",
                campus_diaries: "https://rvce.edu.in/department/etc/campus_diaries/",
                hod_message: "https://rvce.edu.in/department/etc/dr_nagamani_k_hod_message/",
                m_tech: "https://rvce.edu.in/department/etc/mtech_in_digital_communication_engineering/",
                coe_5g: "https://rvce.edu.in/wp-content/uploads/2025/11/5G-AND-EMERGING-WIRELESS-TECHNOLOGIES.pdf"
            },
            {
                n:"Industrial Engg & Mgmt (IEM)",
                c:"im", 
                u:"https://rvce.edu.in/department/iem/b_e_industrial_engineering_and_management/",
                intake: "60",
                accreditation: "NBA Accredited", 
                hod:"Dr. Rajeswara Rao K V S",
                info: "Established in 1980, the department integrates engineering and management to align with industry needs. It offers an NBA-accredited B.E. programme and maintains close associations with professional societies like IIIE, ORSI, and IIMM.",
                about: "https://rvce.edu.in/department/iem/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/iem/faculty/",
                placement: "https://rvce.edu.in/department/iem/placement/",
                labs: "https://rvce.edu.in/department/iem/laboratories/",
                facilities: "https://rvce.edu.in/department/iem/facilities/",
                research: "https://rvce.edu.in/department/iem/research/",
                coe: "https://rvce.edu.in/department/iem/centre-of-excellence-in-logistics-supply-chain-management/"
            },
            {
                n:"Information Science & Engg (ISE)",
                c:"is", 
                u:"https://rvce.edu.in/department/ise/department--of-information-science-and-engineering/",
                intake: "135",
                accreditation: "NBA Accredited", 
                hod:"Dr. G. S. Mamatha",
                info: "Offers a dynamic curriculum focused on AI, IoT, Cloud Computing and Cybersecurity. Supported by a VTU-recognised research centre and partnerships with Microsoft, Nvidia and HP.",
                about: "https://rvce.edu.in/department/ise/about_dept/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/ise/faculty/",
                placement: "https://rvce.edu.in/department/ise/placement/",
                labs: "https://rvce.edu.in/department/ise/facilities/",
                research: "https://rvce.edu.in/department/ise/research/",
                campus_diaries: "https://rvce.edu.in/department/ise/campus_diaries/",
                hod_message: "https://rvce.edu.in/department/ise/dr_g_s_mamatha_hod_message/",
                m_tech_soft: "https://rvce.edu.in/department/ise/mtech_in_software_engineering/",
                m_tech_it: "https://rvce.edu.in/department/ise/mtech_in_information_technology/",
                coe_wic: "https://rvce.edu.in/department/ise/ise_coe/"
            },
            {
                n:"Mathematics (MATHS)",
                c:"mat", 
                u:"https://rvce.edu.in/department/maths/main_dept/", 
                hod:"Dr. Jayalatha G",
                info: "Established in 1963, one of the oldest departments at RVCE. It provides high-quality education and features a dedicated team of experts with research spanning Pure Mathematics, Applied Mathematics, and Quantum Computing.",
                about: "https://rvce.edu.in/department/maths/about_dept/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/maths/main_dept/",
                labs: "https://rvce.edu.in/department/maths/facilities/",
                research: "https://rvce.edu.in/department/maths/research/",
                campus_diaries: "https://rvce.edu.in/department/maths/campus_diaries/",
                hod_message: "https://rvce.edu.in/department/maths/dr_jayalatha_g_hod_message/",
                networking: "https://rvce.edu.in/department/maths/maths_cn/",
                collab: "https://rvce.edu.in/department/maths/collaboration-and-networking/"
            },
            {
                n:"Mechanical Engineering (ME)",
                c:"me", 
                u:"https://rvce.edu.in/department/me/department_of_mechanical_engineering/",
                intake: "120",
                accreditation: "NBA Accredited", 
                hod:"Dr. Shanmukha Nagaraj",
                info: "Dedicated to fostering innovation and excellence in Mechanical Engineering. Offers premier education and cultivates cutting-edge research in Design, Materials, Thermal and Manufacturing, strengthened by robust industry collaborations.",
                about: "https://rvce.edu.in/department/me/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/me/faculty/",
                placement: "https://rvce.edu.in/department/me/placement/",
                labs: "https://rvce.edu.in/department/me/laboratories/",
                facilities: "https://rvce.edu.in/department/me/facilities/",
                research: "https://rvce.edu.in/department/me/research/",
                rd_labs: "https://rvce.edu.in/department/me/rd_labs/",
                campus_diaries: "https://rvce.edu.in/department/me/campus_diaries/",
                coe_toyota: "https://rvce.edu.in/department/me/rv_toyota_kriloskar_centre_of_excellence_in_automotive_engineering/",
                coe_ev: "https://rvce.edu.in/department/me/rvce_morris_garage_centre_of_excellence_in_electric_vehicle_technology_evt/",
                m_tech_pdm: "https://rvce.edu.in/department/me/mtech-in-product-design-and-manufacturing/",
                m_tech_machine: "https://rvce.edu.in/department/me/mtech_in_machine_design/",
                coe_bosch: "https://rvce.edu.in/department/me/rv-bosch-rexroth-centre-for-automation-technologies/",
                coe_benz: "https://rvce.edu.in/department/me/rv-mercedes-benz-centre-for-automotive-mechatronics/"
            },
            {
                n:"Physics (PHY)",
                c:"phy", 
                u:"https://rvce.edu.in/department/physics/department_of_physics/", 
                hod:"Dr. G. Shireesha",
                info: "Established in 1963, it offers Engineering Physics courses and global electives. Known for its research, discipline, and academic rigour, it features 13 doctorate-qualified faculty and advanced research facilities.",
                about: "https://rvce.edu.in/department/physics/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#ug",
                faculty: "https://rvce.edu.in/department/physics/faculty/",
                labs: "https://rvce.edu.in/department/physics/laboratories/",
                facilities: "https://rvce.edu.in/department/physics/facilities/",
                research: "https://rvce.edu.in/department/physics/research/#",
                collab: "https://rvce.edu.in/department/physics/collaboration-and-networking/"
            },
            {
                n:"Physical Education & Sports",
                c:"sports", 
                u:"https://rvce.edu.in/department-of-physical-education-sports/", 
                info: "The Department of Physical Education and Sports at RVCE promotes student fitness and excellence in sports, organizing VTU tournaments and offering sports scholarships for exceptional athletes.",
                scholarship: "https://rvce.edu.in/department-of-physical-education-sports/rvce-sports-scholarship/",
                tournaments: "https://rvce.edu.in/department-of-physical-education-sports/v-t-u-tournament-organized/"
            }
        ],
        pg: [
            {n:"M.Tech Biotechnology",c:"bt", hod:"Dr. Nagashree N Rao", u:"https://rvce.edu.in/department/biotechnology/department-of-biotechnology/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {n:"M.Tech Structural Engg",c:"cv_se", hod:"Dr. Anjaneyappa", u:"https://rvce.edu.in/department/civil_engineering/m_tech_structural_engineering/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {n:"M.Tech Highway Tech",c:"cv_ht", hod:"Dr. Anjaneyappa", u:"https://rvce.edu.in/department/civil_engineering/m-tech-highway-technology/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {n:"M.Tech CSE",c:"cs_cse", hod:"Dr. Shanta Rangaswamy", u:"https://rvce.edu.in/department/cse/m-tech-cse/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {n:"M.Tech Computer Network Engg",c:"cs_cne", hod:"Dr. Shanta Rangaswamy", u:"https://rvce.edu.in/department/cse/m-tech-cne/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {n:"M.Tech Power Electronics",c:"ee_pe", hod:"Dr. J N Hemalatha", u:"https://rvce.edu.in/department/eee/mtech_in_power_electronics/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {n:"M.Tech VLSI & Embedded",c:"ec_vlsi", hod:"Dr. Ravish Aradhya H V", u:"https://rvce.edu.in/department/ece/m-tech-in-vlsi-design-embedded-systems/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {n:"M.Tech Comm Systems",c:"ec_cs", hod:"Dr. Ravish Aradhya H V", u:"https://rvce.edu.in/department/ece/master-of-technology-in-m-tech-communication-systems/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {n:"M.Tech Software Engg",c:"is_se", hod:"Dr. Mamatha G S", u:"https://rvce.edu.in/department/ise/ise-mtech-in-software-engineering/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {n:"M.Tech Info Tech",c:"is_it", hod:"Dr. Mamatha G S", u:"https://rvce.edu.in/department/ise/ise_mtech_in_information_technology/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {n:"M.Tech Product Design",c:"me_pd", hod:"Dr. Shanmukha Nagaraj", u:"https://rvce.edu.in/department/me/mtech-in-product-design-and-manufacturing/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {n:"M.Tech Machine Design",c:"me_md", hod:"Dr. Shanmukha Nagaraj", u:"https://rvce.edu.in/department/me/mtech-in-machine-design/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {n:"M.Tech Digital Comm",c:"et_dc", hod:"Dr. Nagamani K", u:"https://rvce.edu.in/department/etc/mtech_in_digital_communication_engineering/", syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme"},
            {
                n:"Master of Computer Applications (MCA)",
                c:"mca", 
                u:"https://rvce.edu.in/department/mca/main_department/", 
                hod:"Dr. Jasmine K S",
                info: "Established in 1997, it offers MCA (Intake: 120), M.Sc. by Research, and Ph.D. The programme holds 4 NBA accreditations and boasts consistent 100% placement opportunities with a 96% internship conversion rate.",
                about: "https://rvce.edu.in/department/mca/about_the_department/",
                syllabus: "https://rvce.edu.in/academics_and_examinations/rvce_scheme_syllabus/#pgscheme",
                faculty: "https://rvce.edu.in/department/mca/main_department/",
                placement: "https://rvce.edu.in/department/mca/placement/",
                labs: "https://rvce.edu.in/department/mca/laboratories/",
                facilities: "https://rvce.edu.in/department/mca/facilities/",
                research: "https://rvce.edu.in/department/mca/research/",
                campus_diaries: "https://rvce.edu.in/department/mca/campus_diaries/"
            }
        ]
    },
    hostels: {
        boys: "Chamundi, Cauvery, Sir MV, Krishna blocks",
        girls: "Diamond Jubilee, Krishna Garden blocks",
        amenities: "Vegetarian mess, Wi-Fi, laundry, 24/7 security",
        note: "Allotted during admission — no advance booking",
        url: "https://rvce.edu.in/facilities/"
    },
    facilities: {
        list: ["Central Library","Food Court","Sports Complex (400m track, Cricket/Football)","Health Centre","ICICI Bank","Post Office","Gymnatorium","Labs & Workshops"],
        url: "https://rvce.edu.in/facilities/"
    },
    placements2026: {
        maxSalary: "₹67 LPA Highest Package (2026 Batch)",
        avgSalary: "₹16.86 LPA (Current Average)",
        companies: "192+ companies visited (Ongoing)",
        offers: "698+ offers made so far",
        topRecruiters: "Microsoft, Google, Amazon, Atlassian, Cisco, Dell, Intel, Adobe, Samsung"
    },
    placements2025: {
        maxSalary: "₹67 LPA Highest Package (2025 Batch, B.E.)",
        mtechMax: "₹35 LPA (M.Tech highest)",
        mcaMax: "₹20 LPA (MCA highest)",
        avgSalary: "₹13.76 LPA (2025 B.E. Avg)",
        companies: "262 companies participated in 2025 drive",
        offers: "922 offers to B.E./B.Tech students",
        topRecruiters: "Microsoft, Google, Amazon, Atlassian, Cisco, Dell, Intel, Adobe, Flipkart, Samsung, PayPal, IBM, Deloitte, JP Morgan, Goldman Sachs, Bosch, Mercedes-Benz"
    },
    placements2024: {
        maxSalary: "₹92 LPA Highest Package (2024 Batch)",
        avgSalary: "~₹11.5 LPA (2024 Avg)",
        companies: "249 companies participated in 2024 drive",
        offers: "917 total offers with 75% placement rate"
    },
    'iem': {
        name: "Industrial Engineering and Management",
        ug: {
            ongoing: {
                name: "B.E. Industrial Engineering and Management (2025-26)",
                companies: 12, offers: 30, students: 27,
                avg: "12.46 LPA", max: "21.45 LPA"
            },
            full: [
                { name: "2024-25", companies: 30, offers: 51, students: 46, avg: "7.68 LPA", max: "21.45 LPA" },
                { name: "2023-24", companies: 30, offers: 53, students: 51, avg: "8.39 LPA", max: "20.00 LPA" },
                { name: "2022-23", companies: 35, offers: 49, students: 49, avg: "9.06 LPA", max: "18.99 LPA" },
                { name: "2021-22", companies: 38, offers: 66, students: 42, avg: "9.03 LPA", max: "14.95 LPA" }
            ]
        }
    },
    'mca': {
        name: "Master of Computer Applications",
        pg: {
            ongoing: {
                name: "Master of Computer Applications (2025-26)",
                companies: 3, offers: 21, students: 22,
                avg: "4.00 LPA", max: "11.59 LPA"
            },
            full: [
                { name: "2025-26 (Timeline)", companies: 24, offers: 62, students: 59, avg: "9.00 LPA", max: "20.00 LPA" },
                { name: "2024-25", companies: 35, offers: 80, students: 80, avg: "8.94 LPA", max: "20.00 LPA" },
                { name: "2023-24", companies: 52, offers: 132, students: 95, avg: "8.29 LPA", max: "25.00 LPA" },
                { name: "2021-22", companies: 56, offers: 146, students: 102, avg: "10.00 LPA", max: "28.00 LPA" },
                { name: "2020-21", companies: 85, offers: 274, students: 210, avg: "7.50 LPA", max: "20.00 LPA" }
            ]
        }
    },
    'me': {
        name: "Mechanical Engineering",
        ug: {
            ongoing: {
                name: "B.E. Mechanical Engineering (2025-26)",
                companies: 39, offers: 86, students: 80,
                avg: "9.22 LPA", max: "18.33 LPA"
            },
            full: [
                { name: "2024-25", companies: 44, offers: 88, students: 82, avg: "8.21 LPA", max: "18.33 LPA" },
                { name: "2023-24", companies: 46, offers: 78, students: 70, avg: "9.07 LPA", max: "18.00 LPA" },
                { name: "2022-23", companies: 60, offers: 113, students: 85, avg: "8.35 LPA", max: "16.00 LPA" },
                { name: "2021-22", companies: 45, offers: 112, students: 69, avg: "9.05 LPA", max: "18.00 LPA" }
            ]
        },
        pg: {
            ongoing: [
                {
                    name: "M.Tech. Product Design And Manufacturing (2025-26)",
                    companies: 6, offers: 8, students: 8, avg: "7.09 LPA", max: "14.00 LPA"
                },
                {
                    name: "M.Tech. Machine Design (2025-26)",
                    companies: 8, offers: 7, students: 7, avg: "6.02 LPA", max: "8.00 LPA"
                }
            ],
            full: [
                { name: "Product Design & Manufacturing (2024-25)", companies: 6, offers: 8, students: 8, avg: "7.09 LPA", max: "14.00 LPA" },
                { name: "Product Design & Manufacturing (2022-23)", companies: 12, offers: 23, students: 23, avg: "6.82 LPA", max: "10.00 LPA" },
                { name: "Product Design & Manufacturing (2021-22)", companies: 14, offers: 20, students: 20, avg: "6.45 LPA", max: "12.00 LPA" },

                { name: "Machine Design (2024-25)", companies: 8, offers: 7, students: 7, avg: "6.02 LPA", max: "8.00 LPA" },
                { name: "Machine Design (2022-23)", companies: 10, offers: 17, students: 17, avg: "6.44 LPA", max: "20.00 LPA" },
                { name: "Machine Design (2021-22)", companies: 12, offers: 15, students: 15, avg: "5.83 LPA", max: "12.00 LPA" }
            ]
        }
    },
    'mca': {
        name: "Master of Computer Applications",
        pg: {
            ongoing: {
                name: "Master of Computer Applications (2025-26)",
                companies: 3, offers: 21, students: 22,
                avg: "4.00 LPA", max: "11.59 LPA"
            },
            full: [
                { name: "2025-26 (Timeline)", companies: 24, offers: 62, students: 59, avg: "9.00 LPA", max: "20.00 LPA" },
                { name: "2024-25", companies: 35, offers: 80, students: 80, avg: "8.94 LPA", max: "20.00 LPA" },
                { name: "2023-24", companies: 52, offers: 132, students: 95, avg: "8.29 LPA", max: "25.00 LPA" },
                { name: "2021-22", companies: 56, offers: 146, students: 102, avg: "10.00 LPA", max: "28.00 LPA" },
                { name: "2020-21", companies: 85, offers: 274, students: 210, avg: "7.50 LPA", max: "20.00 LPA" }
            ]
        }
    },
    'et': {
        name: "Electronics And Telecommunication Engineering",
        ug: {
            ongoing: {
                name: "B.E. Electronics And Telecommunication Engineering (2025-26)",
                companies: 300, offers: 61, students: 47,
                avg: "11.128 LPA", max: "50.00 LPA"
            },
            full: [
                { name: "2024-25", companies: 41, offers: 53, students: 49, avg: "9.67 LPA", max: "39.00 LPA" },
                { name: "2023-24", companies: "N/A", offers: 45, students: 60, avg: "75% Placed", max: "12 Higher Studies" },
                { name: "2022-23", companies: "N/A", offers: 39, students: 64, avg: "61% Placed", max: "0 Higher Studies" },
                { name: "2021-22", companies: "N/A", offers: 48, students: 60, avg: "80% Placed", max: "0 Higher Studies" },
                { name: "2020-21", companies: "N/A", offers: 47, students: 54, avg: "87% Placed", max: "1 Higher Studies" }
            ]
        },
        pg: {
            ongoing: {
                name: "M.Tech. Digital Communication Engineering (2025-26)",
                companies: 1, offers: 1, students: 1,
                avg: "15.00 LPA", max: "15.00 LPA"
            },
            full: [
                { name: "2024-25*", companies: 1, offers: 1, students: 1, avg: "15.00 LPA", max: "15.00 LPA" },
                { name: "2023-24", companies: 12, offers: 8, students: 8, avg: "7.50 LPA", max: "10.00 LPA" },
                { name: "2021-22", companies: 12, offers: 11, students: 11, avg: "7.09 LPA", max: "18.60 LPA" },
                { name: "2020-21", companies: 16, offers: 22, students: 22, avg: "8.22 LPA", max: "21.50 LPA" }
            ]
        }
    },
    hostelDetails: {
        boysBlocks: { chamundi: "1st year UG", cauvery: "2nd & 3rd year UG", cauveryAnnex: "1st year UG", sirMV: "Final year UG & PG" },
        girlsBlocks: { djBlock: "1st year & higher sem B.E. (On-campus)", krishnaGarden: "Higher sem B.E., M.Tech, MCA (Off-campus, Pattanagere)" },
        fees: { tripleSharing: "~₹1,42,000 – ₹1,53,000 per annum", doubleSharing: "~₹1,84,000 – ₹1,91,000 per annum" },
        facilities: "Furnished rooms (bed, study table, chair, cupboard), Wi-Fi, 24/7 security, gymnasium, indoor/outdoor sports, vegetarian mess",
        messDetails: {
            type: "Strictly Vegetarian",
            messes: ["Cauvery Mess (1st Year)", "Sir MV Mess (Seniors)", "DJ Mess (Girls)"],
            meals: "Breakfast, Lunch, Evening Snacks, and Dinner",
            management: "Student-run Mess Committee (Finalizes menu & monitors quality)",
            timings: "Specific timings for each meal (Curfew applicable)",
            contact: "080-68188256 / 8271"
        }
    },
    safety: {
        cctv: "Extensive CCTV surveillance across all blocks, classrooms, and hostels",
        wardens: "Residential wardens in all hostel blocks",
        healthCentre: "On-campus Health Centre with 24/7 medical support and ambulance facility. Partnered with Aster Hospital for specialist care.",
        healthDetails: {
            doctor: "Full-time resident medical officer available",
            services: ["Emergency Care", "Consultation", "24/7 Ambulance", "Medical Pharmacy"],
            hospital: "Tied up with Aster Hospital, RV Road for advanced treatments"
        },
        grievance: "Active Internal Complaints Committee (ICC) and Student Grievance Redressal Cell",
        antiRagging: "Strict Zero Tolerance policy; Anti-ragging squad ensures a safe environment for freshers"
    },
    campus: {
        fest: "8th Mile (Annual Technocultural Fest)",
        clubs: ["Alaap (Music)", "Raaga (Dance)", "TEDxRVCE", "CARV (Cultural)", "Entrepreneurship Cell (E-Cell)", "Namma RVCE (Social)", "DebSoc", "QuizCorp", "Photography Club", "Literary Society", "Kannada Sangha", "Rotaract Club", "Coding Club", "Robotics Club", "NSS", "NCC", "RVCE Ham Club (Amateur Radio)"],
        teams: ["Team Ashwa (Formula Student Racing)", "Team dhRuVa (Solar Car Team)", "Team Antariksh (Satellite & Space Tech)", "ASTRA Robotics (Competitive Robotics)", "Team Chimera (Hybrid Engine Vehicle)", "Team Vyoma (UAS & Drones)", "Team Garuda (Supermileage Vehicle)", "Team Jatayu (Autonomous UAVs)", "Team Helios Racing (ATV/Baja Racing)"],
        societies: ["IEEE RVCE", "SAE RVCE", "ACM Student Chapter", "CSI Student Chapter"],
        urls: {
            innovation: "https://rvce.edu.in/innovative_teams/",
            cultural: "https://rvce.edu.in/cultural_teams/"
        }
    },
    events: [
        { name: "GenAI Workshop (B.E. 2nd Year)", date: "May 15-20, 2026", type: "Technical" },
        { name: "CSITSS 2026 Conference (IEEE)", date: "2026", type: "Research" },
        { name: "Applied AI/ML in Renewable Energy Certification", date: "Mar 16 – Jun 19, 2026", type: "Technical" },
        { name: "ICOECA 2026 Conference", date: "June 12-14, 2026", type: "Research" },
        { name: "8th Mile — Annual Technocultural Fest", date: "2026 (TBA)", type: "Cultural" }
    ],
    attendance: {
        requirement: "Minimum 85% attendance mandatory",
        consequence: "Students below 85% may be detained from appearing in semester exams",
        tracking: "Attendance tracked through mandatory ID card system"
    },
    nearby: {
        areas: "Mysuru Road, Kengeri, Rajarajeshwari Nagar, Pattanagere",
        food: "Multiple eateries, cafes & restaurants near campus on Mysuru Road",
        shopping: "RR Nagar has malls (Gopalan Arcade), local markets, and retail stores",
        hospitals: "BGS Gleneagles Global Hospital, Rajarajeshwari Medical College Hospital nearby",
        connectivity: "NICE Road junction nearby, Kengeri Metro station, BMTC bus routes"
    },
    circulars: {
        academic: "https://rvce.edu.in/academic-circular/",
        admissions: "https://rvce.edu.in/admission-circulars/",
        examinations: "https://rvce.edu.in/examination-circulars/",
        feePayment: "https://rvce.edu.in/academics_and_examinations/fee_payment_circulars/"
    },
    ncc: {
        battalion: "6 Karnataka Battalion NCC",
        established: "2008",
        strength: "80 cadets (Army wing)",
        officer: "ANO in charge",
        activities: "Drill, weapons training, adventure activities, camps (CATC, ATC, NIC), Republic Day parade participation, social service"
    },
    nss: {
        units: "2 NSS Units",
        strength: "200+ volunteers",
        activities: "Blood donation camps, tree plantation drives, rural development, Swachh Bharat campaigns, health awareness programs",
        motto: "Not Me But You"
    },
    kannadaSangha: {
        info: "Kannada Sangha promotes Kannada language, literature, and culture through events, literary competitions, and cultural celebrations.",
        events: "Rajyotsava celebrations, Kannada Habba, poetry recitals, drama performances"
    },
    rvjsteam: {
        info: "RVJ STEAM Team bridges Science, Technology, Engineering, Arts, and Mathematics through hands-on projects, workshops, and school outreach programs."
    },
    faculty: {
        deans: [
            { n: "Dr. Shanmukha Nagaraj", u: "https://rvce.edu.in/department/me/faculty-bio/", d: "Professor & Head of Department (Mechanical Engineering)", e: "23 years" },
            { n: "Dr. B.M. Sagar", u: "https://rvce.edu.in/department/ise/dr_b_m_sagar/", d: "Professor & Dean Student Affairs", e: "21 years" },
            { n: "Dr. M Uttara Kumari", u: "https://rvce.edu.in/department/ece/dr_m_uttara_kumari/", d: "Professor & Dean (Research & Development)", e: "22 years" },
            { n: "Dr. D. Ranganath", u: "https://rvce.edu.in/department/chemical_engineering/dr_d_ranganath/", d: "Professor & Dean Placement & Training", e: "29 years" },
            { n: "Dr. M Krishna", u: "https://rvce.edu.in/department/me/dr_krishna_m/", d: "Professor & Dean-Continuing Education & Skill Development", e: "24 years" }
        ],
        ae: [
            { n: "Dr. R Supreeth", u: "https://rvce.edu.in/department/ae/dr_r_supreeth/", d: "Associate Prof & Head", e: "13.6 Years" },
            { n: "Dr. Ravindra S Kulkarni", u: "https://rvce.edu.in/department/ae/dr_ravindra_s_kulkarni/#", d: "Professor", e: "Teaching: 26 years Research: 2 years" },
            { n: "Dr. Promio Charles F", u: "https://rvce.edu.in/department/ae/dr_promio_charles_f/", d: "Associate Professor", e: "Research-5.5 years; Industry- 1 year; Teaching- 8.6 Years" },
            { n: "Bhaskar K", u: "https://rvce.edu.in/department/ae/bhaskar_k/", d: "Assistant Professor", e: "Teaching: 1 years; Industrial: 7 Years; Research: 3 Years" },
            { n: "Pranesh Kumar S R", u: "https://rvce.edu.in/department/ae/pranesh_kumar_s_r/", d: "Assistant Professor", e: "10.3 Years" },
            { n: "Dr. Benjamin Rohit", u: "https://rvce.edu.in/department/ae/dr_benjamin_rohit/", d: "Assistant Professor", e: "Teaching: 10.4 years" },
            { n: "Srinivasan S", u: "https://rvce.edu.in/department/ae/srinivasan_s/", d: "Assistant Professor", e: "18 years" },
            { n: "Mukesh M", u: "https://rvce.edu.in/department/ae/mukesh_m/", d: "Assistant Professor", e: "Research( 2years) , Teaching( 10.2 years)" },
            { n: "Prof. Deepak Bana", u: "https://rvce.edu.in/department/ae/prof_deepak_bana/", d: "Visiting Professor", e: "Research (1year), Teaching (7 years), Indian Air Force (29 years)" },
            { n: "Dr. Balaguru Pandian", u: "https://rvce.edu.in/department/ae/dr-balaguru-pandian/", d: "Assistant Professor", e: "R&D (5 year), Industry (1 Year), Consulting (2 years), Academia (3 years)" },
            { n: "Dr. Karthik Vel E", u: "https://rvce.edu.in/department/ae/dr-karthik-vel-e/", d: "Assistant Professor", e: "-3.5 years (Research) and 1 year (Academic)" },
            { n: "Dr. Ekta Jain", u: "https://rvce.edu.in/department/ae/ekta-jain/", d: "Assistant Professor", e: "Not specified" }
        ],
        aiml: [
            { n: "Dr. Vijayalakshmi M N", u: "https://rvce.edu.in/department/ai_ml/dr_vijayalakshmi_m_n/", d: "Associate Professor", e: "25 years" },
            { n: "Dr. S. Anupama Kumar", u: "https://rvce.edu.in/department/ai_ml/dr_s_anupama_kumar/", d: "Associate Professor", e: "25 years" },
            { n: "Dr. Narasimha Swamy S", u: "https://rvce.edu.in/department/ai_ml/dr_narasimha_swamy_s/", d: "Assistant Professor", e: "Teaching: 4 years" },
            { n: "Dr. Somesh Nandi", u: "https://rvce.edu.in/department/ai_ml/dr_somesh_nandi/", d: "Assistant Professor", e: "7 years" },
            { n: "K Vishwavardhan Reddy", u: "https://rvce.edu.in/department/ai_ml/dr_k_vishwavardhan_reddy/", d: "Assistant Professor", e: "11 Years" },
            { n: "Prof. Sonika C T", u: "https://rvce.edu.in/department/wp-content/uploads/2025/10/Sonika.pdf", d: "Assistant Professor", e: "Not specified" },
            { n: "Prof. Manasa M", u: "https://rvce.edu.in/department/ai_ml/prof_manasa_m/", d: "Assistant Professor", e: "2 years" },
            { n: "Prof. Harshitha V", u: "https://rvce.edu.in/department/ai_ml/prof_harshitha_v/", d: "Assistant Professor", e: "Not specified" },
            { n: "Prof. Rushikesh Anil Padaki", u: "https://rvce.edu.in/department/ai_ml/prof_rushikesh_anil_padaki/", d: "Assistant Professor", e: "Not specified" }
        ],
        bt: [
            { n: "Dr. Nagashree N Rao", u: "https://rvce.edu.in/department/biotechnology/dr_nagashree_n_rao/", d: "Professor and HoD", e: "27 Years" },
            { n: "Dr. Vidya Niranjan", u: "https://rvce.edu.in/department/biotechnology/dr_vidya_niranjan/", d: "Professor", e: "22 years" },
            { n: "Dr. G Vijaya Kumar", u: "https://rvce.edu.in/department/biotechnology/dr_g_vijaya_kumar/", d: "Associate Professor and Associate Dean (PG Studies)", e: "20 years" },
            { n: "Dr. A. H. Manjunatha Reddy", u: "https://rvce.edu.in/department/biotechnology/dr_a_h_manjunatha_reddy/", d: "Professor", e: "18 years" },
            { n: "Dr. Neeta Shivakumar", u: "https://rvce.edu.in/department/biotechnology/dr_neeta_shivakumar/", d: "Associate Professor", e: "16 years" },
            { n: "Dr. Lingayya Hiremath", u: "https://rvce.edu.in/department/biotechnology/dr_lingayya_hiremath/", d: "Assistant Professor", e: "19 years" },
            { n: "Dr. M Rajeswari", u: "https://rvce.edu.in/department/biotechnology/dr_m_rajeswari/", d: "Assistant Professor", e: "21 years" },
            { n: "Dr. Ajeet Kumar Srivastava", u: "https://rvce.edu.in/department/biotechnology/dr_ajeet_kumar_srivastava/", d: "Assistant Professor", e: "19 years" },
            { n: "Dr. Shivandappa", u: "https://rvce.edu.in/department/biotechnology/dr_shivandappa/", d: "Assistant Professor", e: "17 years" },
            { n: "Dr. Narendra Kumar S", u: "https://rvce.edu.in/department/biotechnology/dr_narendra_kumar_s/", d: "Assistant Professor", e: "15 years" },
            { n: "Dr. Praveen Kumar Gupta", u: "https://rvce.edu.in/department/biotechnology/dr_praveen_kumar_gupta/", d: "Assistant Professor", e: "15 years" },
            { n: "Dr. Trilok Chandran B", u: "https://rvce.edu.in/department/biotechnology/dr_trilok_chandran_b/", d: "Assistant Professor", e: "17 years" },
            { n: "Dr. H. Raju", u: "https://rvce.edu.in/department/biotechnology/dr_h_raju/", d: "Assistant Professor", e: "15 years" },
            { n: "Dr. Sumathra M", u: "https://rvce.edu.in/department/biotechnology/dr_sumathra_m/", d: "Assistant Professor", e: "13 years" },
            { n: "Dr. H G Ashok Kumar", u: "https://rvce.edu.in/department/biotechnology/dr_h_g_ashok_kumar/", d: "Professor", e: "Teaching: 17 years" },
            { n: "Dr. A V Narayan", u: "https://rvce.edu.in/department/biotechnology/dr_a_v_narayan/", d: "Associate Professor", e: "19 Years" },
            { n: "Dr. Ashwani Sharma", u: "https://rvce.edu.in/department/biotechnology/dr_ashwani_sharma/", d: "Assistant Professor", e: "19 Years" }
        ],
        ch: [
            { n: "Dr. Jagadish H Patil", u: "https://rvce.edu.in/department/chemical_engineering/dr_jagadish_h_patil/", d: "Associate Professor and Head", e: "22 years" },
            { n: "Dr. D. Ranganath", u: "https://rvce.edu.in/department/chemical_engineering/dr_d_ranganath/", d: "Professor and Dean Placement", e: "29 years" },
            { n: "Dr. Vinod Kallur", u: "https://rvce.edu.in/department/chemical_engineering/dr_vinod_kallur/", d: "Associate Professor", e: "24 years" },
            { n: "Dr. Basavaraja R. J.", u: "https://rvce.edu.in/department/chemical_engineering/dr_basavaraja_r_j/", d: "Associate Professor", e: "17 years" },
            { n: "Dr. Vidya C.", u: "https://rvce.edu.in/department/chemical_engineering/dr_vidya_c/", d: "Assistant Professor", e: "14 years" },
            { n: "Dr. Rajalakshmi Mudbidre", u: "https://rvce.edu.in/department/chemical_engineering/dr_rajalakshmi_mudbidre/", d: "Assistant Professor and Associate Dean", e: "14 years" },
            { n: "Dr. Ujwal Shreenag Meda", u: "https://rvce.edu.in/department/chemical_engineering/dr_ujwal_shreenag_meda/", d: "Assistant Professor", e: "10 years" },
            { n: "Dr. Manjula Sarode", u: "https://rvce.edu.in/department/chemical_engineering/dr_manjula_sarode/", d: "Assistant Professor", e: "11 years" },
            { n: "Dr. Vinutha Moses", u: "https://rvce.edu.in/department/chemical_engineering/vinutha_moses/", d: "Assistant Professor", e: "16 years" },
            { n: "Dr. P L Muralidhara", u: "https://rvce.edu.in/department/chemical_engineering/dr_p_l_muralidhara/", d: "Assistant Professor", e: "28 years" },
            { n: "Dr. Anupama V. Joshi", u: "https://rvce.edu.in/department/chemical_engineering/anupama_v_joshi/", d: "Assistant Professor", e: "7 years" }
        ],
        chy: [
            { n: "Dr. Mahesh R", u: "https://rvce.edu.in/department/chemistry/dr_mahesh_r/", d: "Associate Professor", e: "24 Years" },
            { n: "Dr. Raviraj Kusanur", u: "https://rvce.edu.in/department/chemistry/raviraj_a_k/", d: "Professor", e: "14 Years" },
            { n: "Dr. Swarna M. Patra", u: "https://rvce.edu.in/department/chemistry/dr_swarna_mayee_patra/", d: "Associate Professor", e: "13 Years" },
            { n: "Dr. C. Manjunatha", u: "https://rvce.edu.in/department/chemistry/dr_manjunatha_c/", d: "Associate Professor", e: "16 Years" },
            { n: "Dr. Divakara S. G.", u: "https://rvce.edu.in/department/chemistry/divakara-s-g/", d: "Associate Professor", e: "19 Years" },
            { n: "Dr. Sham Aan M. P.", u: "https://rvce.edu.in/department/chemistry/sham_aan_m_p/", d: "Assistant Professor", e: "10.5 Years" },
            { n: "Dr. M. Sridharan", u: "https://rvce.edu.in/department/chemistry/dr_sridharan_m/", d: "Assistant Professor", e: "8 Years" },
            { n: "Dr. Vishnumurthy K. A", u: "https://rvce.edu.in/department/chemistry/dr_vishnumurthy_k_a/", d: "Assistant Professor", e: "11 Years" },
            { n: "Dr. Swetha S. M.", u: "https://rvce.edu.in/department/chemistry/dr_swetha_s_m/", d: "Assistant Professor", e: "2 Year" },
            { n: "Dr. Rita Hemanth Shankar", u: "https://rvce.edu.in/department/chemistry/dr_rita_hemanth_shankar/", d: "Assistant Professor", e: "7.5 years" },
            { n: "Dr. Radha N", u: "https://rvce.edu.in/department/chemistry/dr-radha-n/", d: "Assistant Professor", e: "Not specified" }
        ],
        cv: [
            { n: "Dr. Anjaneyappa", u: "https://rvce.edu.in/department/civil_engineering/civil-faculty-bio/", d: "Professor and Head", e: "21 Years" },
            { n: "Dr. Radhakrishna", u: "https://rvce.edu.in/department/civil_engineering/dr-radhakrishna/", d: "Professor & PG Dean (Non-Circuit)", e: "31 Years" },
            { n: "Dr. M. V. Renukadevi", u: "https://rvce.edu.in/department/civil_engineering/dr_m_v_renukadevi/", d: "Professor", e: "31 years" },
            { n: "Dr. B. C. Udayashankar", u: "https://rvce.edu.in/department/civil_engineering/dr-b-c-udayashankar/", d: "Professor", e: "33 Years" },
            { n: "Dr. M. S. Nagakumar", u: "https://rvce.edu.in/department/civil_engineering/dr-m-s-nagakumar/", d: "Professor", e: "31 Years" },
            { n: "Dr. V. Anantharama", u: "https://rvce.edu.in/department/civil_engineering/dr_v_anantharama/", d: "Associate Professor", e: "26 Years" },
            { n: "Dr. Vinod A. R.", u: "https://rvce.edu.in/department/civil_engineering/dr_vinod_a_r/", d: "Associate Professor", e: "18 Years" },
            { n: "Dr. M. Lokeshwari", u: "https://rvce.edu.in/department/civil_engineering/dr_m_lokeshwari/", d: "Associate Professor", e: "18 Years" },
            { n: "Dr. T. Raghavendra", u: "https://rvce.edu.in/department/civil_engineering/dr_t_raghavendra/", d: "Associate Professor", e: "18 years" },
            { n: "Dr. S. Nethravathi", u: "https://rvce.edu.in/department/civil_engineering/dr_s_nethravathi/", d: "Associate Professor", e: "16 Years" },
            { n: "Dr. L. Durga Prashanth", u: "https://rvce.edu.in/department/civil_engineering/dr-l-durga-prashanth/", d: "Associate Professor", e: "13 years" },
            { n: "Dr. M. Varuna", u: "https://rvce.edu.in/department/civil_engineering/dr_m_varuna/", d: "Assistant Professor", e: "14 years" },
            { n: "Dr. Sindhu D", u: "https://rvce.edu.in/department/civil_engineering/dr-sindhu-d/", d: "Assistant Professor", e: "13 years" },
            { n: "Dr. Sunil S", u: "https://rvce.edu.in/department/civil_engineering/dr-sunil-s/", d: "Assistant Professor", e: "13 Years" },
            { n: "Dr. Praveen Kumar K", u: "https://rvce.edu.in/department/civil_engineering/dr-praveen-kumar-k/", d: "Assistant Professor", e: "13 Years 6 months" },
            { n: "Dr. K. Gajalakshmi", u: "https://rvce.edu.in/department/civil_engineering/dr-k-gajalakshmi/", d: "Assistant Professor", e: "13 Years 6 months" },
            { n: "Dr. Somanath. M. Basutkar", u: "https://rvce.edu.in/department/civil_engineering/dr_somanath_m_basutkar/", d: "Assistant Professor", e: "4 years" },
            { n: "Dr. Venugopal. G", u: "https://rvce.edu.in/department/civil_engineering/dr-venugopal-g/", d: "Assistant Professor", e: "4 years" },
            { n: "Dr. Vikas Mendi", u: "https://rvce.edu.in/department/civil_engineering/dr_vikas_mendi/", d: "Assistant Professor", e: "6 years" },
            { n: "Ram Thilak", u: "https://rvce.edu.in/department/civil_engineering/ram-thilak/", d: "Assistant Professor", e: "7 years" },
            { n: "Dr. Vageesh H P", u: "https://rvce.edu.in/department/civil_engineering/vageesh_h_p/", d: "Assistant Professor", e: "10 years" },
            { n: "Ravikiran S Wali", u: "https://rvce.edu.in/department/civil_engineering/ravikiran_s_wali/", d: "Assistant Professor", e: "9 years" },
            { n: "Dr. Shrithi S Badami", u: "https://rvce.edu.in/department/civil_engineering/shrithi-s-badami/", d: "Assistant Professor", e: "9 Years" },
            { n: "Dr. Shashi Kiran C R", u: "https://rvce.edu.in/department/civil_engineering/shashi_kiran_c_r/", d: "Assistant Professor", e: "10 Years" },
            { n: "Gowtham Prasad M E", u: "https://rvce.edu.in/department/civil_engineering/gowtham_prasad_m_e/", d: "Assistant Professor", e: "8 years" },
            { n: "Ashwin Thammaiah K", u: "https://rvce.edu.in/department/civil_engineering/ashwin_thammaiah_k/", d: "Assistant Professor", e: "8 years" },
            { n: "Dr. K. Madhavi", u: "https://rvce.edu.in/department/civil_engineering/dr_k_madhavi/", d: "Assistant Professor", e: "17 Years" },
            { n: "Dr. M. R. Archana", u: "https://rvce.edu.in/department/civil_engineering/dr_m_r_archana/", d: "Assistant Professor", e: "12 years" }
        ],
        cs: [
            { n: "Dr. Ramakanth Kumar P", u: "https://rvce.edu.in/department/cse/dr_ramakanth_kumar_p/", d: "Professor & Dean (CSE cluster)", e: "31 years" },
            { n: "Dr. Shanta Rangaswamy", u: "https://rvce.edu.in/department/cse/dr_shanta_rangaswamy/", d: "Professor & Head", e: "24 years" },
            { n: "Dr. Vinay Hegde", u: "https://rvce.edu.in/department/cse/dr_vinay_hegde/", d: "Professor", e: "19 years" },
            { n: "Dr. Hemavathy R.", u: "https://rvce.edu.in/department/cse/dr_hemavathy_r/", d: "Professor", e: "23 years" },
            { n: "Dr. Krishnappa H K", u: "https://rvce.edu.in/department/cse/dr_krishnappa_h_k/", d: "Professor", e: "25 years" },
            { n: "Dr. Sowmyarani C N", u: "https://rvce.edu.in/department/cse/dr-sowmyarani-c-n/", d: "Professor", e: "14 years" },
            { n: "Dr. Rajashree Shettar", u: "https://rvce.edu.in/department/cse/dr-rajashree-shettar/", d: "Professor", e: "27 years" },
            { n: "Dr. G. S. Nagaraja", u: "https://rvce.edu.in/department/cse/dr-g-s-nagaraja/", d: "Professor", e: "30 years" },
            { n: "Dr. Minal Moharir", u: "https://rvce.edu.in/department/cse/dr-minal-moharir/", d: "Professor & Programme Coordinator", e: "Not specified" },
            { n: "Dr. Soumya A.", u: "https://rvce.edu.in/department/cse/dr_soumya_a/", d: "Professor & Program Coordinator", e: "21 years" },
            { n: "Dr. Deepamala N", u: "https://rvce.edu.in/department/cse/dr_deepamala_n/", d: "Professor", e: "15 years" },
            { n: "Dr. Azra Nasreen", u: "https://rvce.edu.in/department/cse/dr_azra_nasreen/", d: "Associate Professor", e: "20 years" },
            { n: "Dr. Pratiba D", u: "https://rvce.edu.in/department/cse/dr-pratiba-d/", d: "Associate Professor", e: "17 years" },
            { n: "Dr. Praveena T", u: "https://rvce.edu.in/department/cse/dr-praveena-t/", d: "Associate Professor", e: "18 years" },
            { n: "Dr. K. Badari Nath", u: "https://rvce.edu.in/department/cse/dr_k_badari_nath/", d: "Associate Professor", e: "13 years" },
            { n: "Dr. Chethana R. Murthy", u: "https://rvce.edu.in/department/cse/dr-chethana-r-murthy/", d: "Associate Professor", e: "16 years" },
            { n: "Dr. Pavithra H", u: "https://rvce.edu.in/department/cse/dr-pavithra-h/", d: "Associate Professor", e: "14 years" },
            { n: "Dr. Prapulla S B", u: "https://rvce.edu.in/department/cse/dr-prapulla-s-b/", d: "Associate Professor", e: "17 years" },
            { n: "Dr. Sneha M", u: "https://rvce.edu.in/department/cse/dr_sneha_m/", d: "Associate Professor", e: "11 years" },
            { n: "Dr. Smriti Srivastava", u: "https://rvce.edu.in/department/cse/dr_smriti_srivastava/", d: "Associate Professor", e: "13 years" },
            { n: "Dr. Veena Gadad", u: "https://rvce.edu.in/department/cse/dr-veena-gadad/", d: "Associate Professor", e: "12 years" },
            { n: "Dr. Mohana", u: "https://rvce.edu.in/department/cse/dr_mohana/", d: "Associate Professor", e: "18 years" },
            { n: "Dr. Sandhya S.", u: "https://rvce.edu.in/department/cse/dr_sandhya_s/", d: "Associate Professor", e: "19 years" },
            { n: "Dr. Manas M N", u: "https://rvce.edu.in/department/cse/dr-manas-m-n/", d: "Associate Professor", e: "8 years" },
            { n: "Dr. Manonmani S.", u: "https://rvce.edu.in/department/cse/dr-manonmani-s/", d: "Assistant Professor", e: "13 years" },
            { n: "Dr. Deepika Dash", u: "https://rvce.edu.in/department/cse/prof-deepika-dash/", d: "Assistant Professor", e: "13 years" },
            { n: "Dr. Anitha Sandeep", u: "https://rvce.edu.in/department/cse/dr_anitha_sandeep/", d: "Assistant Professor", e: "21+ years" },
            { n: "Dr. Apoorva Udaya Kumar Chate", u: "https://rvce.edu.in/department/cse/prof_apoorva_udaya_kumar_chate/", d: "Assistant Professor", e: "1.5 year" },
            { n: "Prof. Rajatha", u: "https://rvce.edu.in/department/cse/prof_rajatha/", d: "Assistant Professor", e: "7 years" },
            { n: "Dr. Savitri Kulkarni", u: "https://rvce.edu.in/department/cse/prof_savitri_kulkarni/", d: "Assistant Professor", e: "14.5 years" },
            { n: "Dr. Karanam Sunil Kumar", u: "https://rvce.edu.in/department/cse/dr-karanam-sunil-kumar/", d: "Assistant Professor", e: "18 years" },
            { n: "Prof. Saraswathi Govind Datard", u: "https://rvce.edu.in/department/cse/prof-saraswathi-govind-datard/", d: "Assistant Professor", e: "3 years" },
            { n: "Prof. Mekhala Vinod Purohit", u: "https://rvce.edu.in/department/cse/prof_mekhala_vinod_purohit/", d: "Assistant Professor", e: "6 months" },
            { n: "Prof. Deepthi L.", u: "https://rvce.edu.in/department/cse/prof-deepthi-l/", d: "Assistant Professor", e: "9 Years" },
            { n: "Dr. Sahana D. Shejwadkar", u: "https://rvce.edu.in/department/cse/sahana-d-shejwadkar/", d: "Assistant Professor", e: "1 Month" },
            { n: "Sanjana Ravindra Otihal", u: "https://rvce.edu.in/department/cse/sanjana-ravindra-otihal/", d: "Assistant Professor", e: "1 Month" },
            { n: "Dr. Jyoti Shetty", u: "https://rvce.edu.in/department/cse/dr-jyoti-shetty/", d: "Associate Professor", e: "16 years" },
            { n: "Dr. Suma B.", u: "https://rvce.edu.in/department/cse/dr_suma_b/", d: "Associate Professor", e: "22 Years" },
            { n: "Dr. Sindhu D V", u: "https://rvce.edu.in/department/cse/dr_sindhu_d_v/", d: "Assistant Professor", e: "5 years" },
            { n: "Prof. Nithyashree G D", u: "https://rvce.edu.in/department/cse/prof_nithyashree_g_d/", d: "Assistant Professor", e: "2 year" },
            { n: "Prof. Shweta Babu Prasad", u: "https://rvce.edu.in/department/cse/prof_shweta_babu_prasad/", d: "Assistant Professor", e: "1 year" },
            { n: "Dr. Srividya M. S.", u: "https://rvce.edu.in/department/cse/dr_srividya_m_s/", d: "Associate Professor", e: "Industry: 8 Years, Teaching: 13 Years" },
            { n: "Prof. L. Kala Chandrashekhar", u: "https://rvce.edu.in/department/cse/prof_l_kala_chandrashekhar/", d: "Assistant Professor", e: "17 year" },
            { n: "Prof. Ganashree K C", u: "https://rvce.edu.in/department/cse/prof-ganashree-k-c/", d: "Assistant Professor", e: "18 years" }
        ],
        ee: [
            { n: "Dr. S G Srivani", u: "https://rvce.edu.in/department/eee/dr_s_g_srivani_bio/", d: "Professor (Fixed Term)", e: "Teaching & Research: 39 years | Industry : 6 months" },
            { n: "Dr. Hemalatha J.N.", u: "https://rvce.edu.in/department/eee/dr_hemalatha_j_n/", d: "Associate Professor", e: "Teaching: 22 Years" },
            { n: "Dr. Adinatha Jain", u: "https://rvce.edu.in/department/eee/dr_adinatha_jain/", d: "Associate Professor", e: "Teaching: 22 Years , Industry: 5 years" },
            { n: "Dr. Rachana S. Akki", u: "https://rvce.edu.in/department/eee/dr_rachana_s_akki/", d: "Associate Professor", e: "Teaching: 18 Years , Industry: 7 Years" },
            { n: "Dr. C. Sunanda", u: "https://rvce.edu.in/department/eee/dr_c_sunanda/", d: "Assistant Professor", e: "Teaching: 22 years" },
            { n: "Dr. Suresh C", u: "https://rvce.edu.in/department/eee/dr_suresh_c/", d: "Assistant Professor", e: "Teaching: 20 years" },
            { n: "Dr. Ajay K.M.", u: "https://rvce.edu.in/department/eee/dr_ajay_k_m/", d: "Assistant Professor", e: "Teaching: 13 Years" },
            { n: "Dr. Madhu B.R.", u: "https://rvce.edu.in/department/eee/dr_madhu_b_r/", d: "Assistant Professor", e: "Teaching: 17 Years" },
            { n: "Dr. Sushmita Sarkar", u: "https://rvce.edu.in/department/eee/dr_sushmita_sarkar/", d: "Assistant Professor", e: "Teaching: 14 Years" },
            { n: "Raja Vidya", u: "https://rvce.edu.in/department/eee/raja_vidya/", d: "Assistant Professor", e: "Teaching – 12.5 Years , Industry – 04 years" },
            { n: "Dr. Parth Sarathi Panigrahy", u: "https://rvce.edu.in/department/eee/dr_parth_sarathi_panigrahy/", d: "Assistant Professor", e: "8.8 years" },
            { n: "Dr. Pandry Narendra Rao", u: "https://rvce.edu.in/department/eee/dr_pandry_narendra_rao/", d: "Assistant Professor", e: "Teaching & Research: 9 years , Industry : 3 Years" },
            { n: "Dr. Abhilash Krishna D G", u: "https://rvce.edu.in/department/eee/dr_abhilash_krishna_d_g/", d: "Assistant Professor", e: "02 Years" }
        ],
        ec: [
            { n: "Dr. H. V. Ravish Aradhya", u: "https://rvce.edu.in/department/ece/dr_h_v_ravish_aradhya/", d: "Professor & HoD", e: "34 years" },
            { n: "Dr. K. S. Geetha", u: "https://rvce.edu.in/department/ece/dr_k_s_geetha/", d: "Professor and Vice-Principal", e: "34 years" },
            { n: "Dr. M. Uttara Kumari", u: "https://rvce.edu.in/department/ece/dr_m_uttara_kumari/", d: "Professor & Dean (R&D)", e: "22 years" },
            { n: "Dr. Prakash Biswagar", u: "https://rvce.edu.in/department/ece/dr_prakash_biswagar/", d: "Professor", e: "30 years" },
            { n: "Dr. Ramesh K B", u: "https://rvce.edu.in/department/ece/dr_ramesh_k_b/", d: "Associate Professor", e: "Not specified" },
            { n: "Dr. Veena Devi", u: "https://rvce.edu.in/department/ece/dr_veena_devi/", d: "Associate Professor", e: "20 years" },
            { n: "Dr. Govinda Raju M", u: "https://rvce.edu.in/department/ece/dr_govinda_raju_m/", d: "Associate Professor", e: "15 Years" },
            { n: "Dr. Mahesh A", u: "https://rvce.edu.in/department/ece/dr_mahesh_a/", d: "Associate Professor", e: "16 years" },
            { n: "Dr. Shilpa D. R.", u: "https://rvce.edu.in/department/ece/dr_shilpa_d_r/", d: "Associate Professor & Assoc. Dean(P&T)", e: "10 years" },
            { n: "Dr. Abhay A. Deshpande", u: "https://rvce.edu.in/department/ece/dr_abhay_a_deshpande/", d: "Associate Professor", e: "8 years" },
            { n: "Dr. Chethana G", u: "https://rvce.edu.in/department/ece/dr_chethana_g/", d: "Assistant Professor", e: "12 years" },
            { n: "Dr. Sujata D. Badiger", u: "https://rvce.edu.in/department/ece/dr_sujata_d_badiger/", d: "Assistant Professor", e: "20 Years" },
            { n: "Dr. Rohini S. Hallikar", u: "https://rvce.edu.in/department/ece/dr_rohini_s_hallikar/", d: "Assistant Professor", e: "20 Years" },
            { n: "Dr. Sujatha Hiremath", u: "https://rvce.edu.in/department/ece/dr_sujatha_hiremath/", d: "Assistant Professor", e: "20 years" },
            { n: "Dr. Deepashree Devaraj", u: "https://rvce.edu.in/department/ece/dr-deepashree-devaraj/", d: "Assistant Professor (Selection Grade)", e: "Not specified" },
            { n: "Dr. Rajani Katiyar", u: "https://rvce.edu.in/department/ece/dr_rajani_katiyar/", d: "Assistant Professor", e: "Teaching: 20 Years" },
            { n: "Dr. K. A. Nethravathi", u: "https://rvce.edu.in/department/ece/dr_k_a_nethravathi/", d: "Assistant Professor(Selection Grade)", e: "Teaching: 18 Years." },
            { n: "Dr. Harsha H", u: "https://rvce.edu.in/department/ece/dr_harsha/", d: "Assistant Professor", e: "Teaching: 17 Years." },
            { n: "Dr. Ramavenkateswaran N", u: "https://rvce.edu.in/department/ece/dr_ramavenkateswaran_n/", d: "Assistant Professor (Selection Grade)", e: "Teaching: 16 Years Industry: 2 Years" },
            { n: "Dr. Roopa J", u: "https://rvce.edu.in/department/ece/dr_roopa_j/", d: "Assistant Professor", e: "Teaching: 16 Years , Industry: 2 Years , Research: 10 Years" },
            { n: "P Narashimaraja", u: "https://rvce.edu.in/department/ece/p_narashimaraja/", d: "Assistant Professor", e: "Teaching: 18 Years" },
            { n: "Dr. Veena Divya Krishnappa", u: "https://rvce.edu.in/department/ece/veena_divya_krishnappa/", d: "Assistant Professor", e: "Teaching: 16 yrs; Industry: 02 yrs; Research: 09 yrs" }
        ],
        ei: [
            { n: "Dr. Padmaja K V", u: "https://rvce.edu.in/department/eim/dr_padmaja_k_v/", d: "Professor and Associate Dean- IT", e: "33 yrs" },
            { n: "Dr. Prasanna Kumar S. C.", u: "https://rvce.edu.in/department/eim/dr_prasanna_kumar_s_c/", d: "Professor", e: "26yrs" },
            { n: "Prof. Venkatesh S", u: "https://rvce.edu.in/department/eim/prof_venkatesh_s/", d: "Associate Professor", e: "35 yrs" },
            { n: "Dr. K. B. Ramesh", u: "https://rvce.edu.in/department/eim/dr_k_b_ramesh/", d: "Associate Professor", e: "30yrs" },
            { n: "Dr. Anand Jatti", u: "https://rvce.edu.in/department/eim/dr_anand_jatti/", d: "Associate Professor", e: "22 yrs" },
            { n: "Dr. Sudarshan B. G.", u: "https://rvce.edu.in/department/eim/dr_sudarshan_b_g/", d: "Associate Professor", e: "20 yrs" },
            { n: "Dr. Rachana S. Akki", u: "https://rvce.edu.in/department/eim/dr_rachana_s_akki/#", d: "Assistant Professor", e: "18 yrs" },
            { n: "Dr. Deepashree Devaraj", u: "https://rvce.edu.in/department/eim/dr_deepashree_devaraj/", d: "Assistant Professor", e: "21 yrs" },
            { n: "Dr. Tabitha Janumala", u: "https://rvce.edu.in/department/eim/dr_tabitha_janumala/", d: "Assistant Professor", e: "17 yrs" },
            { n: "Dr. Rajasree P.M.", u: "https://rvce.edu.in/department/eim/dr_rajasree_p_m/", d: "Assistant Professor", e: "13 yrs" },
            { n: "Dr. Kendaganna Swamy S", u: "https://rvce.edu.in/department/eim/dr_kendaganna_swamy_s/", d: "Assistant Professor", e: "13 yrs" }
        ],
        et: [
            { n: "Dr. Nagamani K", u: "https://rvce.edu.in/department/etc/dr_nagamani_k_bio/", d: "Professor and Head", e: "21 Years" },
            { n: "Dr. H.V. Kumaraswamy", u: "https://rvce.edu.in/department/etc/dr_h_v_kumaraswamy/", d: "Professor", e: "30 Years" },
            { n: "Dr. K. Sreelakshmi", u: "https://rvce.edu.in/department/etc/dr_k_sreelakshmi/", d: "Professor & PG Dean Studies (Circuit Branches)", e: "28 yrs" },
            { n: "Dr. P. Nagaraju", u: "https://rvce.edu.in/department/etc/dr_p_nagaraju/", d: "Associate Professor & Associate Dean PG Studies", e: "30 Years" },
            { n: "Dr. B. Roja Reddy", u: "https://rvce.edu.in/department/etc/dr_b_roja_reddy/", d: "Associate Professor", e: "22 yrs" },
            { n: "Dr. Premananda B S", u: "https://rvce.edu.in/department/etc/dr_premananda_b_s/", d: "Associate Professor", e: "22 Yrs" },
            { n: "Dr. Bhagya R", u: "https://rvce.edu.in/department/etc/dr_bhagya_r/", d: "Associate Professor", e: "16 Years" },
            { n: "Dr. Shanthi P", u: "https://rvce.edu.in/department/etc/dr_shanthi_p/", d: "Associate Professor", e: "26 Yrs" },
            { n: "Dr. Usha Padma", u: "https://rvce.edu.in/department/etc/dr_usha_padma/", d: "Assistant Professor", e: "19 Years" },
            { n: "Prof. T.P. Mithun", u: "https://rvce.edu.in/department/etc/prof_t_p_mithun/", d: "Assistant Professor", e: "15 Yrs" },
            { n: "Dr. Shambulinga M", u: "https://rvce.edu.in/department/etc/dr_shambulinga_m/", d: "Assistant Professor", e: "12 yrs" },
            { n: "Dr. Sandya H B", u: "https://rvce.edu.in/department/etc/dr_sandya_h_b/", d: "Assistant Professor", e: "12 yrs" },
            { n: "Prof. N.N. Nagendra", u: "https://rvce.edu.in/department/etc/prof_nagendra_n_n/", d: "Assistant Professor", e: "10 yrs" },
            { n: "Prof. Mahalakshmi M. N.", u: "https://rvce.edu.in/department/etc/prof_mahalakshmi_m_n/", d: "Assistant Professor", e: "10Yrs" },
            { n: "Prof. Rakesh K.R", u: "https://rvce.edu.in/department/etc/prof_rakesh_k_r/", d: "Assistant Professor", e: "7 Years" },
            { n: "Dr. K. Saraswathi", u: "https://rvce.edu.in/department/etc/dr_k_saraswathi/", d: "Associate Professor", e: "19 Years" },
            { n: "Dr. Ranjani G", u: "https://rvce.edu.in/department/etc/dr_ranjani_g/", d: "Assistant Professor", e: "19 Years" }
        ],
        im: [
            { n: "Dr. Rajeswara Rao K V S", u: "https://rvce.edu.in/department/iem/dr_rajeswara_rao_k_v_s/", d: "Associate Professor & HoD", e: "Teaching: 26 years, Industry : 2 years" },
            { n: "Dr. K N Subramanya", u: "https://rvce.edu.in/department/iem/dr_k_n_subramanya/", d: "Professor & Principal", e: "Teaching : 31, Research :11" },
            { n: "Dr. C K Nagendra Gupta", u: "https://rvce.edu.in/department/iem/dr_c_k_nagendra_gupta/", d: "Professor", e: "Teaching: 28 Years, Industry : 05 years" },
            { n: "Dr M N Vijaya Kumar", u: "https://rvce.edu.in/department/iem/dr_m_n_vijaya_kumar/", d: "Associate Professor", e: "Teaching: 19 years, Industry : 2 years" },
            { n: "Dr. Ramaa A", u: "https://rvce.edu.in/department/iem/dr_ramaa_a/", d: "Associate Professor & Associate Dean Placement & Training", e: "Teaching: 20 years" },
            { n: "Dr. Shobha N S", u: "https://rvce.edu.in/department/iem/dr_shobha_n_s/", d: "Assistant Professor", e: "Teaching: 21 years" },
            { n: "Dr. Vivekanand S. Gogi", u: "https://rvce.edu.in/department/iem/dr_vivekanand_s_gogi/", d: "Assistant Professor", e: "24 years" },
            { n: "Dr Vikram N Bahadurdesai", u: "https://rvce.edu.in/department/iem/dr_vikram_n_bahadurdesai/", d: "Assistant Professor", e: "Teaching: 18 years, Industry 01 year." },
            { n: "Dr Chitra B T", u: "https://rvce.edu.in/department/iem/dr_chitra_b_t/", d: "Assistant Professor", e: "Teaching: 15 years" },
            { n: "Dr Bindu Ashwini C.", u: "https://rvce.edu.in/department/iem/dr_bindu_ashwini_c/", d: "Assistant Professor", e: "24 Years" },
            { n: "Prof Shruthi M N", u: "https://rvce.edu.in/department/iem/prof_shruthi_m_n/", d: "Assistant Professor", e: "17 years" },
            { n: "Prof B. Nandini", u: "https://rvce.edu.in/department/iem/prof_b_nandini/", d: "Assistant Professor", e: "Teaching: 16 years" },
            { n: "Prof Bhaskar M G", u: "https://rvce.edu.in/department/iem/prof_bhaskar_m_g/", d: "Assistant Professor", e: "Industry: 1 Year, Teaching: 11 Year" },
            { n: "Dr N. S. Narahari", u: "https://rvce.edu.in/department/iem/n_s_narahari/", d: "Visiting Professor", e: "Teaching: 35 years" }
        ],
        is: [
            { n: "Dr. G. S. Mamatha", u: "https://rvce.edu.in/department/ise/dr_g_s_mamatha/", d: "Professor and HoD", e: "20 Years" },
            { n: "Dr. B. M. Sagar", u: "https://rvce.edu.in/department/ise/dr_b_m_sagar/", d: "Professor & Dean Student Affairs", e: "21 Years" },
            { n: "Dr Ashwini K. B.", u: "https://rvce.edu.in/department/ise/dr_ashwini_k_b/", d: "Associate Professor", e: "17 years" },
            { n: "Dr Vanishree K.", u: "https://rvce.edu.in/department/ise/dr_vanishree_k/", d: "Associate Professor", e: "16 years" },
            { n: "Dr Merin Meleet", u: "https://rvce.edu.in/department/ise/dr_merin_meleet/", d: "Associate Professor", e: "17 years" },
            { n: "Dr S. G. Raghavendra Prasad", u: "https://rvce.edu.in/department/ise/s_g_raghavendra_prasad/", d: "Assistant Professor", e: "20 Years" },
            { n: "Dr Rekha B. S.", u: "https://rvce.edu.in/department/ise/rekha_b_s/", d: "Assistant Professor", e: "15 years" },
            { n: "Dr Swetha S.", u: "https://rvce.edu.in/department/ise/swetha_s/", d: "Assistant Professor", e: "13 years" },
            { n: "B K Srinivas", u: "https://rvce.edu.in/department/ise/b_k_srinivas/", d: "Assistant Professor", e: "11 years" },
            { n: "Dr Sushmitha N.", u: "https://rvce.edu.in/department/ise/sushmitha_n/", d: "Assistant Professor", e: "17 years" },
            { n: "Dr Kavitha S. N.", u: "https://rvce.edu.in/department/ise/dr_kavitha_s_n/", d: "Associate Professor", e: "17Years" },
            { n: "Dr Rashmi R", u: "https://rvce.edu.in/department/ise/rashmi_r/", d: "Assistant Professor", e: "18 years" },
            { n: "Dr Anala M. R.", u: "https://rvce.edu.in/department/ise/dr_anala_m_r/", d: "Professor", e: "20 years" },
            { n: "Dr Padmashree T", u: "https://rvce.edu.in/department/ise/dr_padmashree_t/", d: "Associate Professor", e: "17 years" },
            { n: "Dr Poornima Kulkarni", u: "https://rvce.edu.in/department/ise/poornima_kulkarni/", d: "Assistant Professor", e: "10 Years" }
        ],
        mat: [
            { n: "Dr. G. Jayalatha", u: "https://rvce.edu.in/department/maths/dr_g_jayalatha/", d: "Professor and HoD", e: "20 Years" },
            { n: "Dr. Neeti Ghiya", u: "https://rvce.edu.in/department/maths/dr_neeti_ghiya/", d: "Professor", e: "20 Years" },
            { n: "Dr. C. Nandeesh Kumar", u: "https://rvce.edu.in/department/maths/dr_c_nandeesh_kumar/", d: "Associate Professor", e: "25 Years" },
            { n: "Dr. Savithri Shashidhar", u: "https://rvce.edu.in/department/maths/dr_savithri_shashidhar/", d: "Associate Professor", e: "20 Years" },
            { n: "Dr. Prakash R", u: "https://rvce.edu.in/department/maths/dr_prakash_r/", d: "Associate Professor", e: "19 Years" },
            { n: "Dr. Sowmya M", u: "https://rvce.edu.in/department/maths/dr_sowmya_m/", d: "Associate Professor", e: "21 Years" },
            { n: "Dr. Satish V. Motammanavar", u: "https://rvce.edu.in/department/maths/dr_satish_v_motammanavar/", d: "Associate Professor", e: "09 Years" },
            { n: "Dr. Y. Sailaja", u: "https://rvce.edu.in/department/maths/dr_y_sailaja/", d: "Assistant Professor", e: "23 Years" },
            { n: "Dr. Sujatha A.", u: "https://rvce.edu.in/department/maths/dr_sujatha_a/", d: "Assistant Professor", e: "20 Years" },
            { n: "Dr. Vidya Patil", u: "https://rvce.edu.in/department/maths/dr_vidya_patil/", d: "Assistant Professor", e: "18 Years" },
            { n: "Dr. Nivya Muchikel", u: "https://rvce.edu.in/department/maths/dr_nivya_muchikel/", d: "Assistant Professor", e: "21 Years" },
            { n: "Dr. Ravi K. M", u: "https://rvce.edu.in/department/maths/dr_ravi_k_m/", d: "Assistant Professor", e: "21 Years" },
            { n: "P. L. Rajashekhar", u: "https://rvce.edu.in/department/maths/mr_p_l_rajashekhar/", d: "Assistant Professor", e: "18 Years" },
            { n: "Dr. Harish M", u: "https://rvce.edu.in/department/maths/dr_harish_m/", d: "Assistant Professor", e: "10 Years" },
            { n: "Dr. Suman N P", u: "https://rvce.edu.in/department/maths/dr_suman_n_p/", d: "Assistant Professor", e: "8 Years" },
            { n: "Dr. Kiran Kumar D L", u: "https://rvce.edu.in/department/maths/dr_kiran_kumar_d_l/", d: "Assistant Professor", e: "5 Years" },
            { n: "Dr. Venugopal K", u: "https://rvce.edu.in/department/maths/dr_venugopal_k/", d: "Assistant Professor", e: "8 Years" },
            { n: "Dr. Niranjan P. K.", u: "https://rvce.edu.in/department/maths/dr_niranjan_p_k/", d: "Assistant Professor", e: "6.5 Years" },
            { n: "Dr. Suma N Manjunath", u: "https://rvce.edu.in/department/maths/dr_suma_n_manjunath/", d: "Assistant Professor", e: "17 Years" },
            { n: "Dr. Prasanna Kumar T", u: "https://rvce.edu.in/department/maths/dr_prasanna_kumar_t/", d: "Assistant Professor", e: "15 Years" },
            { n: "Dr. Sakshath T n", u: "https://rvce.edu.in/department/maths/dr_sakshath_t_n/", d: "Assistant Professor", e: "07 Years" },
            { n: "Dr. Hemanthkumar B", u: "https://rvce.edu.in/department/maths/dr_hemanthkumar_b/", d: "Assistant Professor", e: "12 Years" },
            { n: "Dr. Kirthiga M", u: "https://rvce.edu.in/department/maths/dr_kirthiga_m/", d: "Assistant Professor", e: "5 Years" },
            { n: "Dr. Vyshnavi D", u: "https://rvce.edu.in/department/maths/dr_vyshnavi_d/", d: "Assistant Professor", e: "6 months" }
        ],
        mca: [
            { n: "Dr Jasmine K. S.", u: "https://rvce.edu.in/department/mca/dr_jasmine_k_s_bio/", d: "Associate Professor and Director", e: "28 Years" },
            { n: "Dr Usha J.", u: "https://rvce.edu.in/department/mca/dr_usha_j/", d: "Professor", e: "26 years" },
            { n: "Dr Andhe Dharani", u: "https://rvce.edu.in/department/mca/dr_andhe_dharani/", d: "Professor", e: "23 Years" },
            { n: "Dr B. Renuka Prasad", u: "https://rvce.edu.in/department/mca/dr_b_renuka_prasad/", d: "Associate Professor", e: "21 Years" },
            { n: "Dr B. H. Chandrashekar", u: "https://rvce.edu.in/department/mca/dr_b_h_chandrashekar/", d: "Associate Professor", e: "Teaching: 19 Years, Technical: 15 Years" },
            { n: "Dr Deepika K", u: "https://rvce.edu.in/department/mca/dr_deepika_k/", d: "Associate Professor", e: "Teaching: 12 Years" },
            { n: "Dr Mohan Aradhya", u: "https://rvce.edu.in/department/mca/dr_mohan_aradhya/", d: "Assistant Professor", e: "Teaching: 18 Years" },
            { n: "Dr Divya T. L.", u: "https://rvce.edu.in/department/mca/dr_divya_t_l/", d: "Assistant Professor", e: "Teaching: 17 Years" },
            { n: "Prof Saravanan C", u: "https://rvce.edu.in/department/mca/prof_saravanan_c/", d: "Assistant Professor", e: "Teaching: 17 Years" },
            { n: "Prof Chandrani Chakravorty", u: "https://rvce.edu.in/department/mca/prof_chandrani_chakravorty/", d: "Assistant Professor", e: "Teaching: 16 Years" },
            { n: "Prof Savita Sheelavant", u: "https://rvce.edu.in/department/mca/prof_savita_sheelavant/", d: "Assistant Professor", e: "Teaching: 17 Years" },
            { n: "Prof Prashanth K", u: "https://rvce.edu.in/department/mca/prof_prashanth_k/", d: "Assistant Professor", e: "Teaching: 14 Years, Industry: 1 Year 8 Months" }
        ],
        me: [
            { n: "Dr. Shanmukha N", u: "https://rvce.edu.in/department/me/faculty-bio/", d: "Professor and HOD", e: "23 years" },
            { n: "Dr Krishna M", u: "https://rvce.edu.in/department/me/dr_krishna_m/", d: "Professor and Dean-Continuing Education & Skill Development", e: "24 years" },
            { n: "Dr Nanjundaradhya N. V.", u: "https://rvce.edu.in/department/me/dr_nanjundaradhya_n_v/", d: "Professor", e: "2 years" },
            { n: "Dr Srihari P. V.", u: "https://rvce.edu.in/department/me/dr_srihari_p_v/", d: "Associate Professor", e: "20 years" },
            { n: "Dr P. R. Venkatesh", u: "https://rvce.edu.in/department/me/dr_p_r_venkatesh/", d: "Associate Professor", e: "31 years" },
            { n: "Dr Sridhar R", u: "https://rvce.edu.in/department/me/dr_sridhar_r/", d: "Associate Professor", e: "13 years" },
            { n: "Dr Harisha S. K.", u: "https://rvce.edu.in/department/me/dr_harisha_s_k/", d: "Associate Professor", e: "16 years" },
            { n: "Dr Ratna Pal", u: "https://rvce.edu.in/department/me/dr_ratna_pal/", d: "Assistant Professor", e: "10 years" },
            { n: "Dr Nataraj J. R.", u: "https://rvce.edu.in/department/me/dr_nataraj_j_r/", d: "Associate Professor & Dean Global Partnerships", e: "16 years" },
            { n: "Dr Nagesh S", u: "https://rvce.edu.in/department/me/dr_nagesh_s/", d: "Assistant Professor", e: "10 years" },
            { n: "Dr Ramakrishna Hegde", u: "https://rvce.edu.in/department/me/dr_ramakrishna_hegde/", d: "Assistant Professor", e: "12 years" },
            { n: "Dr Chandrakumar R", u: "https://rvce.edu.in/department/me/dr_chandrakumar_r/", d: "Assistant Professor", e: "17 years" },
            { n: "Dr Sourabha S. Havaldar", u: "https://rvce.edu.in/department/me/dr_sourabha_srinivasa_havaldar/", d: "Assistant Professor", e: "13 years" },
            { n: "Keshavamurthy Y. C.", u: "https://rvce.edu.in/department/me/keshavamurthy_y_c/", d: "Assistant Professor", e: "12 years" },
            { n: "Dr Keshav M", u: "https://rvce.edu.in/department/me/dr_keshav_m/", d: "Assistant Professor", e: "06 years" },
            { n: "Dr Girish Kumar R", u: "https://rvce.edu.in/department/me/dr_girish_kumar_r/", d: "Assistant Professor", e: "06 years" },
            { n: "Dr Girish V. A.", u: "https://rvce.edu.in/department/me/dr_girish_v_a/", d: "Assistant Professor", e: "Teaching: 11 years" },
            { n: "Dr Gangadhar Angadi", u: "https://rvce.edu.in/department/me/dr_gangadhar_angadi/", d: "Assistant Professor", e: "Teaching: 12 year" },
            { n: "Dr Anjaneya G", u: "https://rvce.edu.in/department/me/dr_anjaneya_g/", d: "Assistant Professor", e: "Teaching: 25 year" },
            { n: "Jinka Ranganayakulu", u: "https://rvce.edu.in/department/me/jinka_ranganayakalu/", d: "Assistant Professor", e: "Teaching: 12 year" },
            { n: "Dr Rakesh Kumar", u: "https://rvce.edu.in/department/me/rakesh_kumar/", d: "Assistant Professor", e: "Teaching : 3 Years" },
            { n: "Gajanan", u: "https://rvce.edu.in/department/me/gajanan/", d: "Assistant Professor", e: "Teaching: 10 years" },
            { n: "Abhiram E. R.", u: "https://rvce.edu.in/department/me/abhiram_e_r/", d: "Assistant Professor", e: "Teaching : 4 Years" },
            { n: "Dr Prapul Chandra A C", u: "https://rvce.edu.in/department/me/dr_prapul_chandra_a_c/", d: "Assistant Professor", e: "Teaching : 4 Years" },
            { n: "Dr Mahantash M. Math", u: "https://rvce.edu.in/department/me/dr_mahantash_m_math/", d: "Assistant Professor", e: "Teaching: 14 years" },
            { n: "Prof G R Rajkumar", u: "https://rvce.edu.in/department/me/dr_g_r_rajkumar/", d: "Associate Professor", e: "Teaching: 15 years" },
            { n: "Dr Bharatish A", u: "https://rvce.edu.in/department/me/dr_bharatish_a/", d: "Assistant Professor", e: "Teaching: 15 years" },
            { n: "Prof Roopa T. S.", u: "https://rvce.edu.in/department/me/dr_roopa_t_s/", d: "Assistant Professor", e: "12 Years" },
            { n: "Dr Ramesh S. Sharma", u: "https://rvce.edu.in/department/me/dr_ramesh_s_sharma/", d: "Professor & Associate Dean PG Programs", e: "Teaching: 19 years" },
            { n: "Dr Kirthan L. J.", u: "https://rvce.edu.in/department/me/dr_kirthan_l_j/", d: "Associate Professor", e: "Teaching: 10 years" },
            { n: "Sujan Chakraborty", u: "https://rvce.edu.in/department/me/sujan_chakraborty/", d: "Assistant Professor", e: "Teaching: 10 year" },
            { n: "Dr Jagannatha Guptha V. L.", u: "https://rvce.edu.in/department/me/dr_jagannatha_guptha_v_l/", d: "Assistant Professor", e: "Teaching: 10 years" }
        ],
        phy: [
            { n: "Dr. G. Shireesha", u: "https://rvce.edu.in/department/physics/dr_g_shireesha/", d: "Associate Professor and Head", e: "Teaching-23 years" },
            { n: "Dr. Bhuvaneswara Babu T", u: "https://rvce.edu.in/department/physics/faculty/", d: "Professor", e: "42 Years" },
            { n: "Dr. D. N. Avadhani", u: "https://rvce.edu.in/department/physics/dr_avadhani_d_n/", d: "Associate Professor", e: "Teaching: 22 years" },
            { n: "Dr. Sudha Kamath M K", u: "https://rvce.edu.in/department/physics/dr_sudha_kamath_m_k/", d: "Associate Professor & Deputy Warden RVCE DJ Girls Hostel", e: "Teaching: 30 years" },
            { n: "Dr. Shubha S", u: "https://rvce.edu.in/department/physics/dr_shubha_s/", d: "Assistant Professor (Selection Grade)", e: "Teaching – 16 years" },
            { n: "Dr. Tribikram Gupta", u: "https://rvce.edu.in/department/physics/dr_tribikram_gupta/", d: "Assistant Professor (Senior Scale)", e: "Teaching – 11 years" },
            { n: "Dr. B. M. Rajesh", u: "https://rvce.edu.in/department/physics/dr_b_m_rajesh/", d: "Assistant Professor (Senior Scale)", e: "Teaching – 12 years" },
            { n: "Dr. Ramaya P", u: "https://rvce.edu.in/department/physics/dr_ramya_p/", d: "Assistant Professor (Senior Scale)", e: "Teaching – 08 years" },
            { n: "Dr. Niranjana K M", u: "https://rvce.edu.in/department/physics/dr_niranjana_k_m/", d: "Assistant Professor", e: "Teaching – 08 years" },
            { n: "Dr. Dileep M S", u: "https://rvce.edu.in/department/physics/dr_dileep_m_s/", d: "Assistant Professor", e: "Teaching 12 years" },
            { n: "Dr. Shwetha K P", u: "https://rvce.edu.in/department/physics/dr_shwetha_k_p/", d: "Assistant Professor", e: "Teaching 17 years" },
            { n: "Dr. Rini Ganguly", u: "https://rvce.edu.in/department/physics/dr_rini_ganguly/", d: "Assistant Professor", e: "Teaching- 3.5 years" },
            { n: "Dr. Kavya K. Nayak", u: "https://rvce.edu.in/department/physics/dr_kavya_k_nayak/", d: "Assistant Professor", e: "Research – 6 years" }
        ]
    }
};

/* =============== INPUT SANITIZATION =============== */
function sanitize(input) {
    // 0. Special condition for CSE specializations and specific overlaps
    input = input.replace(/\b(?:cse|cs)\s+(aiml|ai\s*ml|ai|ds|data\s*science|cy|cyber|cyber\s*security)\b/gi, '$1');
    input = input.replace(/\bsustainability\s+events?\b/gi, 'sustainability');
    input = input.replace(/\bmou's\b/gi, 'mous');

    // 1. Remove dots explicitly to handle c.s.e -> cse
    let cleaned = input.replace(/\./g, '');
    // 2. Remove other special chars but keep underscores and hyphens (vital for years like 2024-25)
    cleaned = cleaned.replace(/[^a-zA-Z0-9_\-\s]/g, ' ').toLowerCase();
    
    // 3. Expand common department abbreviations (excluding common English verbs/words like 'is' or 'me')
    const deptAbbr = {
        'cs': 'cse', 'cse': 'cse',
        'ec': 'ece', 'ece': 'ece',
        'mech': 'mechanical',
        'cv': 'civil',
        'ee': 'eee', 'eee': 'eee',
        'ise': 'ise',
        'ae': 'aerospace', 'aero': 'aerospace',
        'ch': 'chemical', 'chem': 'chemical',
        'bt': 'biotech', 'biotech': 'biotechnology',
        'iem': 'industrial',
        'ei': 'instrumentation', 'eie': 'instrumentation',
        'et': 'telecommunication', 'ete': 'telecommunication',
        'aiml': 'artificial intelligence'
    };
    
    // Replace whole words
    cleaned = cleaned.split(/\s+/).map(w => deptAbbr[w] || w).join(' ');

    // 4. Remove extra spaces
    return cleaned.replace(/\s+/g, ' ').trim();
}

/* =============== INTENT MATCHING (Priority-based) =============== */
// p: 0=greet/bye, 1=very specific, 2=medium, 3=generic fallback
const QA = [
    {k:['hi','hello','hey','hii','hola','good morning','good evening','good afternoon','Namaste','yo','sup','howdy','wassup','yoo','heyo','heyy','hellooo','helloo','namaskara'],id:'greet',p:5},
    {k:['bye','goodbye','thank you','thanks','thats all','see you','cya','take care','ok bye','okay bye','good night','tata','laterz','peace out','im out','gtg','gotta go','kbye'],id:'bye',p:5},
    {k:['circular','circulars','announcement','announcements','latest news','recent notice','notices','update','notification','notifications'],id:'circulars',p:1},
    {k:['career','careers','future','jobs','roles','opportunities','scope','prospects','options'],id:'career_options_menu',p:4},
    // P1: Specific topics
    {k:['hostel','hostels','accommodation','dorm','dormitory','hostel fee','hostel room','single room','shared room','hostel mess','staying','where to stay','stay at rvce','pg','paying guest','hostel life','hstl','hostl'],id:'hostels',p:1},
    {k:['mess','mess food','hostel food','mess menu','breakfast','lunch','dinner','food in hostel','mess charges','mess committee'],id:'mess',p:1},
    {k:['transport','how to reach','bmtc','bus route','kengeri metro','commute to rvce','distance from','reach rvce','reach the college','how to get there','travel to rvce','cab to rvce','auto to rvce','ola to rvce','uber to rvce','metro station','nearest metro'],id:'transport',p:1},
    {k:['wifi','internet','wi fi','connectivity','broadband','net access','wifi password','net speed','slow internet'],id:'wifi',p:1},
    {k:['canteen','food','mess food','eat','dining','cafeteria','food court','what to eat','lunch','breakfast','snacks','tiffin','grub','khana','mess menu','food quality','dabba','maggi point'],id:'food',p:1},
    {k:['exam','exams','examination','examinations','semester exam','end semester','internal','assessment','cie','end sem','mid sem','exam pattern','question paper','question papers','endsem','midsem','internals','ia marks','see exam','cie marks','qp','prev papers','previous papers'],id:'exam',p:1},
    {k:['lateral','lateral entry','diploma holder','dcet','lateral admission'],id:'lateral',p:1},
    {k:['nri','international student','foreign student','overseas','ciwg','pio','oci','foreign quota','nri quota','nri admission','abroad student'],id:'nri',p:1},
    {k:['scholarship','financial aid','stipend','merit scholarship','scholy','scholorship','fee waiver','free seat','freeship'],id:'scholarships',p:1},
    {k:['jee','jee mains','jee main','jee accepted','jee score','jee rank','jee valid','does jee work'],id:'jee',p:1},
    {k:['kcet','comedk','comed k','cet rank','kcet rank','comedk rank'],id:'examTypes',p:1},
    {k:['management quota','management seat','direct admission','donation seat','mgmt quota','mgmt seat','donation','capitation','mq seat'],id:'management_quota',p:1},
    {k:['cutoff','cut off','closing rank','kcet rank','comedk cutoff','last rank','expected cutoff','cutoffs','closing ranks'],id:'cutoffs',p:1},
    {k:['fee','fees','tuition','fee structure','semester fee','total cost','how much cost','how much does it cost','fee details','kitna paisa','kitna lagta','college fees','yearly fees','annual fees','payment','pay fee','how to pay','online payment','payment mode'],id:'fees',p:1},
    {k:['refund','fee refund','cancellation','cancel admission','get money back','refund policy','aicte refund','money back','paisa wapas'],id:'refund_policy',p:1},
    {k:['syllabus','1st semester syllabus','1st sem syllabus','first semester syllabus','scheme','first year subjects','1st year syllabus','what are we studying','sylly','syll','subjects list','what subjects'],id:'syllabus_1st_sem',p:0.8},
    {k:['innovation team','formula student','uav','ashwa','chimera','jatayu','astra robotics','antariksh','student projects','project teams','racing team','baja','sae','drone team'],id:'innovationTeams',p:1},
    {k:['cultural life','culture','college culture','theatre','drama','tedx','tedxrvce','fest','8th mile','eighth mile','annual fest','college fest','cultural events','cultural activities','annual day','culturals','fests','techfest','tech fest'],id:'culturalLife',p:1.5},
    {k:['vision','mission','motto','college vision','rvce vision'],id:'vision',p:1},
    {k:['principal','principal name','who is principal','head of institution','director of rvce','who is the principal','about principal','tell me about principal','princi','whos the princi'],id:'principal',p:1},
    {k:['vice principal','vp','vice-principal','who is vice principal','about vice principal','tell me about vice principal','dr k s geetha','geetha mam'],id:'vice_principal',p:1},
    {k:['hod','head of department','dean','deans','faculty','teachers','professors','who is the hod','list of hods','hods','who is hod','department head','heads','teaching staff'],id:'faculty',p:1.5},
    {k:['deans list','all deans','dean list','executive committee','key executives'],id:'deans_list',p:1},
    {k:['dean academics','academic dean','dean of academics','who is dean academics'],id:'dean_academics',p:0.5},
    {k:['dean student affairs','student affairs dean','dean of student affairs','who is dean student affairs'],id:'dean_student_affairs',p:0.5},
    {k:['dean rnd','dean r and d','dean research','dean of research','who is dean research','research dean'],id:'dean_rnd',p:0.5},
    {k:['hods list','list of hods','all hods','hod list','head of departments','all heads'],id:'hods_list',p:1},
    {k:['coe','coes','centres of excellence','centers of excellence','coe list','research centres','research centers','innovation hubs','all coes','list of coes'],id:'centres_of_excellence',p:1},
    // Specific COE search intents (higher priority for specific names)
    {k:['coe mfc','mfc coe','materials fabrication coe','materials fabrication characterization','coe-mfc','fabrication characterization'],id:'coe_mfc',p:0.5},
    {k:['cisss','cisss coe','hpcc systems','cognitive intelligent systems','hpcc coe','cognitive systems coe'],id:'coe_cisss',p:0.5},
    {k:['iot coe','cisco iot coe','internet of things coe','cisco rvce coe','cisco networking','cisco rvce'],id:'coe_iot',p:0.3},
    {k:['computational genomics coe','genomics coe','bioinformatics coe','biotech coe research'],id:'coe_genomics',p:0.5},
    {k:['sasm','smart antenna coe','sasm coe','anechoic chamber','emi emc coe'],id:'coe_sasm',p:0.5},
    {k:['quantum coe','circuit coe','quantum computing coe','quantum information coe','q-rvce','qrvce'],id:'coe_quantum',p:0.5},
    {k:['hydrogen coe','green tech coe','hydrogen technology coe','fuel cell coe','dover india coe'],id:'coe_hydrogen',p:0.5},
    {k:['toyota','rv toyota','toyota coe','rv toyota coe','automotive engineering coe','toyota kirloskar coe','toyota kirloskar','toyota automotive'],id:'coe_toyota',p:0.3},
    {k:['xr center','xr centre','extended reality coe','vr ar coe','virtual reality coe'],id:'coe_xr',p:0.5},
    {k:['icas','coe icas','integrated circuits coe','vlsi coe','ic design coe'],id:'coe_icas',p:0.5},
    {k:['3s coe','3s infrastructure','safe sustainable smart coe','civil coe research'],id:'coe_3s',p:0.5},
    {k:['logistics coe','supply chain coe','iem coe research','scm coe'],id:'coe_logistics',p:0.5},
    {k:['cav coe','autonomous vehicles coe','connected vehicles coe','self driving coe'],id:'coe_cav',p:0.5},
    {k:['ev coe','electric vehicle coe','mg motor coe','ev technology coe'],id:'coe_ev',p:0.5},
    {k:['bosch','bosch rexroth','rv bosch','bosch coe','bosch rexroth coe','automation coe','plc coe','bosch automation'],id:'coe_bosch',p:0.3},
    {k:['benz','mercedes','mercedes benz','mercedes-benz','adam','mercedes coe','benz coe','adam coe','automotive mechatronics coe','rv mercedes benz','mercedes benz mechatronics'],id:'coe_benz',p:0.3},
    {k:['women in cloud coe','wic coe','cloud computing coe','ise coe research'],id:'coe_wic',p:0.5},
    {k:['sensor coe','csta coe','sensor technology coe','eie sensor coe'],id:'coe_sensor',p:0.5},
    {k:['health coe','chtr','healthcare technology coe','biomedical coe research'],id:'coe_health',p:0.5},
    {k:['5g coe','5g wireless coe','etc coe research','wireless technology coe'],id:'coe_5g',p:0.5},
    {k:['emobility coe','smart grid coe','eee coe research','mobility coe'],id:'coe_mobility',p:0.5},
    {k:['boston ai coe','rvce boston coe','graphcore coe','petaflop coe','boston research'],id:'coe_boston',p:0.5},
    {k:['collaboration','collaborations','partnership','partnerships','industry partners','mou','mous','memorandum','memorandum of understanding','tie up','tieups','industry tie ups','google','microsoft','tata','tata technologies','boeing','airbus','isro','navy','all collaborations','rvce partners','industry mou'],id:'collaborations',p:1},
    {k:['germany','german','indo german','germany program','german program','thws','indo-german','indo german coe','germany coe','würzburg','wurzburg','schweinfurt'],id:'germany_program',p:0.5},
    {k:['social media','facebook','instagram','linkedin','twitter','x handle','follow us','social handles','social links','connect','online presence','fb','insta'],id:'social',p:1},
    {k:['boston','boston training academy','boston uk','boston ai','graphcore','ai research centre'],id:'boston',p:1},
    {k:['health center','health centre','doctor','medical','ambulance','sick','hospital','first aid','emergency medical','clinic'],id:'health_centre',p:1},
    {k:['ieee','sae','acm','csi','societies','professional societies','student chapters','chapters'],id:'professional_societies',p:1},
    {k:['upcoming events','workshops','conferences','what is happening','happening soon'],id:'upcoming_events',p:1.2},
    {k:['calendar','academic calendar','calendar of events','events','college events','rvce events','latest events','recent events','event'],id:'calendar_events',p:0.7},
    {k:['ranking','nirf','iirf','college ranking','where does rvce rank','ranked','best college','rvce rank','top college','rvce ranking'],id:'ranking',p:1},
    {k:['accreditation','naac','nba','naac grade','naac rating','accredited'],id:'accreditation',p:1},
    {k:['timing','timings','working hours','college hours','college time','what time','opening time','closing time','open close','class timings','college timing','kab khulta','when open'],id:'timings',p:1},
    {k:['trust','trust details'],id:'trust',p:1},
    {k:['research','patent','patents','innovation centre','centre of excellence','research centre','grants','funding','research at rvce','research lab','r and d','rnd'],id:'research',p:1},
    {k:['iqac','internal quality assurance','quality assurance cell','iqac cell','naac iqac','quality assurance','iqac rvce'],id:'iqac',p:1},
    {k:['mca','master of computer application','mca dept','mca department','mca course','mca admission'],id:'dept_mca',p:1},
    {k:['phd','doctoral','doctorate','research program','doctor degree','phd admission','phd at rvce'],id:'phd',p:1},
    {k:['vtu','visvesvaraya','affiliated university','university affiliation','vtu affiliation'],id:'vtu',p:1},
    {k:['seat','seats','total seats','intake','intake capacity','seat count','total intake'],id:'intake',p:0.5},
    {k:['student count','student strength','total students','how many students','current students','how many students in rvce','student population'],id:'student_count',p:1},
    {k:['library','central library','books','reading room','e library','digital library','lib','library timing','study room'],id:'library',p:0.3},
    {k:['sports','cricket','football','basketball','volleyball','athletics','gym','gymnatorium','sports complex','games','badminton','table tennis','tt','fitness','workout','sports ground','playground'],id:'sports',p:1},
    {k:['autonomous','autonomy','own syllabus','own exam','autonomous status','is rvce autonomous'],id:'autonomous',p:1},
    {k:['stat','stats','statistic','statistics','figure','figures','data'],id:'stats_disambiguation',p:0.4},
    {k:['number','numbers','num','contact number','phone number','official number','calling','mobile'],id:'numbers_info',p:2.5},
    {k:['placement director','placement officer','dean placement','placement dean','head of placement','placement cell head','who is placement director','placement incharge','placement head','director of placement','placement officer name'],id:'placement_director',p:0.2},
    // Department-specific (with short codes + college slang)
    {k:['computer science','cse','cs','cs department','computer science engineering','cse department','comps','comp sci','cs branch','cs dept'],id:'dept_cs',p:1},
    {k:['artificial intelligence','aiml','ai ml','machine learning','ai department','ai branch','ml branch','ai and ml','cse aiml','cse ai ml','cse ai','cse artificial intelligence'],id:'dept_aiml',p:0.5},
    {k:['electronics and communication','ece','ec','ec department','ece department','entc','e and c','ec branch'],id:'dept_ec',p:1},
    {k:['mechanical engineering','me department','mech','mech department','mechanical','mech engg','mech branch','mechies'],id:'dept_me',p:1},
    {k:['civil engineering','cv department','cv','civil department','civil','civil branch','cv branch','civil engg'],id:'dept_cv',p:1},
    {k:['electrical','eee','ee','ee department','eee department','electrical engineering','elec','electrical branch','triple e'],id:'dept_ee',p:1},
    {k:['aerospace','ae department','ae','aero','aero department','aeronautical','aerospace engineering','aero branch','aero engg'],id:'dept_ae',p:1},
    {k:['biotech','bt','biotechnology','bio technology','bt department','bio tech','bio branch','biotech dept'],id:'dept_bt',p:1},
    {k:['chemical engineering','ch department','ch','chemical engg','che','chem engg','chem branch','chemical dept'],id:'dept_ch',p:1},
    {k:['information science','ise','is department','ise department','is branch','ise branch','info sci'],id:'dept_is',p:1},
    {k:['data science','csds','ds','cs data science','csds department','ds branch','data sci','csds branch','cse ds','cse data science','cse data'],id:'dept_csds',p:0.5},
    {k:['cyber security','cscy','cy','cs cyber security','cscy department','cyber','cyber branch','cscy branch','cybersec','cse cy','cse cyber','cse cyber security'],id:'dept_cscy',p:0.5},
    {k:['telecom','ete','tc','telecommunication','ete department','tc branch','ete branch','tele'],id:'dept_et',p:1},
    {k:['instrumentation','eie','ei','ei department','eie department','instr','instru','ei branch','eie branch'],id:'dept_ei',p:1},
    {k:['industrial engineering','iem','ie','iem department','industrial management','ie branch','iem branch','industrial'],id:'dept_im',p:1},
    // P2: Mid-level
    {k:['placement stats','placement statistics','placement year','year wise placement','2024 placement','placement 2024','2023 placement','placement 2023','2022 placement','placement 2022','2021 placement','placement 2021','2020 placement','placement 2020','past placements','previous year placements','2024','2023','2022','2021','2020'],id:'placements_yearly',p:0.1},
    {k:['2027 placement','2027 placements','placement 2027','placements 2027','placement stats 2027','2028 placement','2028 placements','2029 placement','2027 stats','2027'],id:'placements_future',p:0.1},
    {k:['placement','placements','placed','salary','package','lpa','ctc','highest package','average salary','recruit','hiring','companies visit','which companies','job','jobs','placement details','plcmnt','plcmnts','campus drive','dream company','mass recruit','superdream','dream offer','placed kya','placement scene','on campus placement','off campus placement'],id:'placements',p:0.5},
    {k:['top company','top companies','top recruiter','top recruiters','who recruits','who visits','recruiters','companies'],id:'top_companies',p:0.6},
    {k:['admission','admissions','how to apply','how to join','entrance','eligibility','enroll','apply to rvce','join rvce','get into rvce','admission process','how to get admission','ug adm','pg adm','ug b e','admission kaise','how to get in','want to join','joining process'],id:'admissions',p:1.5},
    {k:['department','departments','branch','branches','stream','streams','course','courses','program','programmes','what courses','all branches','view programs','depts','all depts'],id:'departments',p:2},
    {k:['ug','ug details'],id:'ug_disambiguation',p:2},
    {k:['ug programs','ug programmes','ug program','undergraduate','undergrad','b e','be','btech','b tech','ug courses','b e flavors','b e course','b e courses','be courses','bachelor','bachelors','ug branch'],id:'ugPrograms',p:1.5},
    {k:['pg program','pg programs','postgraduate','postgrad','m tech','mtech','masters','pg courses','pg branch','pg admission'],id:'pgPrograms',p:1.5},
    {k:['facility','facilities','infrastructure','what facilities','amenities','all facilities','infra','college infra','campus infra'],id:'facilities',p:2},
    {k:['website','site','official website','rvce website','visit website','rvce site','college website'],id:'website',p:2},
    // P3: Generic fallback
    {k:['tell me about','know about','information about','about'],id:'about_disambiguation',p:3.5},
    {k:['rvce','about rvce','college','history','founded','established','overview','abt rvce','whats rvce','what is rvce'],id:'about_rvce',p:3},
    {k:['rvei','about rvei','rsst','institutions','what is rvei','who is rvei','parent organization','who manages','who owns','ownership'],id:'about_rvei',p:3},
    {k:['campus life','student life','extracurricular','clubs','life at rvce','campus','student experience','college life','clg life','lyf at rvce','vibes','campus vibes','college scene'],id:'campusLife',p:1.5},
    {k:['innovation teams','project teams','team chimera','team astra','team ojas','team jatayu','rv racing','formula student','satellite team','racing car','electric car','chitrak','dhruva','quantum tech','anoraniya','ham club','amateur radio','vyoma','team vyoma','astra robotics','project garuda','team chitrak','quantum technology','uav','drone','drones'],id:'innovationTeams',p:1.5},
    {k:['team ashwa','ashwa','racing team','formula student ashwa'],id:'team_ashwa',p:0.6},
    {k:['team antariksh','antariksh','satellite team','space tech team','rocket team'],id:'team_antariksh',p:0.6},
    {k:['team vyoma','vyoma','uav team','drone team','aero design team'],id:'team_vyoma',p:0.6},
    {k:['team chimera','chimera','hybrid racing','electric car team'],id:'team_chimera',p:0.6},
    {k:['astra robotics','astra','robotics team','autonomous team'],id:'astra_robotics',p:0.6},
    {k:['team chitrak','chitrak','electric motorcycle team'],id:'team_chitrak',p:0.6},
    {k:['anoraniya','quantum tech team'],id:'anoraniya',p:0.6},
    {k:['project garuda','garuda','super mileage team'],id:'project_garuda',p:0.6},
    {k:['cultural teams','cultural clubs','alaap','raaga','carv','debsoc','quizcorp','photography club','literary society','rotaract','tedx','tedxrvce','namma rvce','kannada sangha','coding club','robotics club','nss','ncc','ham club'],id:'culturalTeams',p:1},
    {k:['dress code','uniform','what to wear','clothes allowed','is there a uniform','can i wear shorts','can i wear jeans','dress rules','formals','casuals allowed','shorts allowed'],id:'dress_code',p:0.8},
    {k:['anti ragging','ragging','helpline','report ragging','ragging completely banned','bullied','harassed','ragging helpline','rag','ragging scene','ragging hota hai','seniors bully'],id:'anti_ragging',p:0.8},
    {k:['contact','contact us','telephone','reach','phone','email','address','location','where is rvce','map','direction','call','bengaluru','bangalore','college address','rvce address','enquiry','enquiries','enqiry'],id:'contact',p:2},
    {k:['menu','main menu','options','help','start','what can you do','show menu','halp','commands'],id:'menu',p:3},
    // ===== PARENT-SPECIFIC INTENTS =====
    {k:['safe','safety','is it safe','is my child safe','is my daughter safe','security','cctv','campus security','safe for girls','is rvce safe','how safe','secure','campus safety','child safety','girl safety','daughter safety','women safety'],id:'safety',p:0.8},
    {k:['attendance','attendance rules','attendance requirement','minimum attendance','85 percent','attendance mandatory','bunking','bunk','proxy','absent','leave policy','attendance policy','how strict','strict attendance','will my child attend'],id:'attendance',p:1},
    {k:['roi','return on investment','worth the fees','worth the money','value for money','is it worth','paisa vasool','fee worth','investment','good investment','waste of money','expensive but good','justification of fees'],id:'roi',p:1},
    {k:['girls hostel','girls hostel rules','girls curfew','girls safety','female hostel','women hostel','hostel for girls','daughter hostel','curfew','curfew time','hostel timings','hostel curfew','in time','girls hostel fees','separate hostel','hostel rules for girls','girls hostel facilities'],id:'girls_hostel',p:0.7},
    {k:['boys hostel','boys hostel rules','boys hostel fee','male hostel','hostel for boys','boys accommodation','boys hostel single room','boys hostel facilities'],id:'boys_hostel',p:0.7},
    {k:['environment','sustainability','environment and sustainability','green campus','solar power','rainwater harvesting','sewage treatment','eco friendly','stp','waste recycling','greenery','campus environment','solar energy','sustainable campus'],id:'environment_sustainability',p:1},
    {k:['nearby','surroundings','area around','near rvce','around campus','neighbourhood','neighborhood','food outside','restaurants near','hospital near','hospitals near','shops near','market near','atm near','nearby places','what is around'],id:'nearby',p:1},
    {k:['internship','internships','intern','summer intern','company intern','internship opportunities','internship cell','internship support','do students get internships','intern kahan','intern milta hai'],id:'internship',p:1},
    {k:['startup','entrepreneurship','startup culture','e cell','ecell','incubation','startup support','business','own company','startup scene','entrepreneur','innovation hub'],id:'startup',p:1},
    {k:['peer','peers','peer quality','student quality','topper','toppers','smart students','competitive','peer group','classmates','caliber','students caliber','how are students','crowd','what type of students'],id:'peer_quality',p:1},
    {k:['worth','worth it','is rvce good','is rvce worth it','should i join','should my child join','rvce vs','rvce or','better college','how is rvce','rvce review','reviews','rvce worth joining','join karu','acha hai kya','kaisa hai','accha college hai'],id:'worth_it',p:1.5},
    {k:['best branch','which branch','branch to choose','best department','top branch','scope','which course','cse vs','ise vs','ece vs','branch selection','konsa branch','best course','trending branch','hot branch','most demand'],id:'best_branch',p:1},
    {k:['parking','vehicle','bike parking','car parking','two wheeler','scooty','bike allowed','vehicle allowed','parking space','parking facility'],id:'parking',p:1},
    {k:['part time','part time job','side hustle','earn while studying','freelance','freelancing','earn money','side income','working student','parttime'],id:'part_time',p:1},
    {k:['alumni','alumni network','famous alumni','notable alumni','alumni association','old students','passed out','alumni connect','alumni support','alumni portal'],id:'alumni',p:1},
    {k:['ncc','national cadet corps'],id:'ncc',p:1},
    {k:['nss','national service scheme'],id:'nss',p:1},
    {k:['mandatory disclosure'],id:'mandatory_disclosure',p:1},
    {k:['kannada sangha'],id:'kannada_sangha',p:1},
    {k:['steam team','rvjsteam'],id:'rvjsteam',p:1},
    {k:['calendar','academic calendar','calendar of events'],id:'calendar_events',p:0.7},
    {k:['comparison','compare','rvce vs pes','rvce vs msrit','rvce vs bms','rvce vs sit','pes vs rvce','msrit vs rvce','bms vs rvce','which is better','better than rvce','rvce better','college comparison'],id:'college_compare',p:1},
    {k:['statutory committees','committees','governing body','academic council','finance committee','board of studies'],id:'committees',p:1},
    {k:['policies','college policies','documents','mandatory disclosure','code of conduct','service rules','quality policy'],id:'policies',p:1},
    // ===== MULTI-TURN CONTEXT INTENTS =====
    {k:['tell me more','more about this','more details','elaborate','explain more','more info','more information','can you tell me more','in detail','detailed info','detail','details','expand','continue','go on','aur batao','aur bata'],id:'_more',p:5},
    {k:['go back','back','previous','prev','go back to','return','wapas','piche'],id:'_back',p:5},
    {k:['what else','anything else','something else','other options','what more','kuch aur','aur kya'],id:'_what_else',p:5},
    {k:['yes','yeah','yep','yup','sure','ok','okay','haan','ha','ji','correct','right'],id:'_yes',p:5},
    {k:['no','nah','nope','nahi','na','not interested','skip'],id:'_no',p:5},
];

// 2. Dynamically inject specific HOD queries for ALL departments from KB
const branchHodIntents = [];
const allBranches = [...KB.departments.ug, ...KB.departments.pg];

allBranches.forEach(branch => {
    const code = branch.c;
    const name = sanitize(branch.n.replace(/\s*\([^)]*\)$/, '').trim()).toLowerCase();
    const shortCode = branch.c.toLowerCase();
    
    const kws = [
        `hod ${shortCode}`, `${shortCode} hod`, `head of ${shortCode}`, `who is the hod of ${shortCode}`,
        `hod ${name}`, `${name} hod`, `head of ${name}`
    ];
    
    // Branch-specific aliases
    if (shortCode === 'cs') kws.push('hod cse', 'cse hod', 'computer science hod');
    if (shortCode === 'ec') kws.push('hod ece', 'ece hod', 'electronics hod');
    if (shortCode === 'ee') kws.push('hod eee', 'eee hod', 'electrical hod');
    if (shortCode === 'me') kws.push('mechanical hod', 'mech hod');
    if (shortCode === 'cv') kws.push('civil hod');

    branchHodIntents.push({ k: kws, id: `hod_${shortCode}`, p: 0.5 });
});
QA.push(...branchHodIntents);

// 2.5 Dynamically inject specific Placement queries for ALL departments from KB
const branchPlacementIntents = [];
allBranches.forEach(branch => {
    const code = branch.c;
    const name = sanitize(branch.n.replace(/\s*\([^)]*\)$/, '').trim()).toLowerCase();
    let shortCode = branch.c.toLowerCase();
    if (shortCode === 'is') shortCode = 'ise';
    if (shortCode === 'me') shortCode = 'mech';
    
    const kws = [
        `${shortCode} placement`, `${shortCode} placements`, `${shortCode} salary`, `${shortCode} package`, `${shortCode} job`,
        `${name} placement`, `${name} placements`,
        `placement in ${shortCode}`, `placements in ${shortCode}`,
        `placement in ${name}`, `placements in ${name}`
    ];
    
    if (shortCode === 'cs') kws.push('cse placement', 'cse placements', 'computer science placement');
    if (shortCode === 'ec') kws.push('ece placement', 'ece placements');
    if (shortCode === 'ee') kws.push('eee placement', 'eee placements');
    if (shortCode === 'me') kws.push('mechanical placement', 'mech placement');
    if (shortCode === 'cv') kws.push('civil placement');

    branchPlacementIntents.push({ k: kws, id: `plcmt_${shortCode}`, p: 0.4 });
});
QA.push(...branchPlacementIntents);

// 2.6 Dynamically inject specific Intake queries for ALL departments from KB
const branchIntakeIntents = [];
allBranches.forEach(branch => {
    const code = branch.c;
    const name = sanitize(branch.n.replace(/\s*\([^)]*\)$/, '').trim()).toLowerCase();
    const shortCode = branch.c.toLowerCase();
    
    const kws = [
        `${shortCode} intake`, `intake of ${shortCode}`, `how many seats in ${shortCode}`, `${shortCode} seats`,
        `${name} intake`, `intake of ${name}`, `how many seats in ${name}`, `${name} seats`
    ];
    
    kws.push(`${shortCode} accreditation`, `${shortCode} accredited`, `${name} accreditation`, `${name} accredited`);
    
    if (shortCode === 'cs') kws.push('cse intake', 'cse seats', 'computer science intake');
    if (shortCode === 'cs') kws.push('cse accreditation', 'computer science accreditation');
    if (shortCode === 'ec') kws.push('ece accreditation');
    if (shortCode === 'ee') kws.push('eee accreditation');
    if (shortCode === 'me') kws.push('mechanical accreditation', 'mech accreditation');
    if (shortCode === 'cv') kws.push('civil accreditation');
    if (shortCode === 'ec') kws.push('ece intake', 'ece seats');
    if (shortCode === 'ee') kws.push('eee intake', 'eee seats');
    if (shortCode === 'me') kws.push('mechanical intake', 'mech intake');
    if (shortCode === 'cv') kws.push('civil intake');

    branchIntakeIntents.push({ k: kws, id: `intake_${shortCode}`, p: 0.4 });
});
QA.push(...branchIntakeIntents);


// 3. Dynamically inject Faculty names for direct search
if (KB.faculty) {
    Object.keys(KB.faculty).forEach(dept => {
        KB.faculty[dept].forEach(fac => {
            const full = fac.n.toLowerCase();
            const plain = fac.n.replace(/Dr\.|Prof\.|Mr\.|Assistant Prof/gi, '').trim().toLowerCase();
            const slug = full.replace(/[^a-z0-9]/g, '');
            // Priority 4 ensures it matches AFTER common command keywords (p=1-3)
            QA.push({ k: [full, plain], id: `fac_${slug}`, p: 4 });
        });
    });
}

function findFacultyMatch(input) {
    const sInput = sanitize(input).toLowerCase().replace(/[^a-z]/g, '');
    let bestMatch = null;
    let bestMatchLength = 0;

    for (const deptCode in KB.faculty) {
        for (const fac of KB.faculty[deptCode]) {
            const fSlug = fac.n.toLowerCase().replace(/[^a-z]/g, '');
            const pSlug = fac.n.replace(/Dr\.|Prof\.|Mr\.|Assistant Prof/gi, '').toLowerCase().replace(/[^a-z]/g, '');
            
            if (sInput === fSlug || sInput === pSlug) {
                return `fac_${fSlug}`;
            }
            if (sInput.length > 5 && (sInput.includes(fSlug) || sInput.includes(pSlug))) {
                const matchLen = sInput.includes(fSlug) ? fSlug.length : pSlug.length;
                if (matchLen > bestMatchLength) {
                    bestMatch = `fac_${fSlug}`;
                    bestMatchLength = matchLen;
                }
            }
        }
    }
    return bestMatch;
    return bestMatch;
}

// Department-wise detailed placement statistics (Latest fetched from RVCE Portal)
KB.placement_stats = {
    
    'cs_core': {
        name: "B.E. Computer Science And Engineering",
        ongoing: { name: "B.E. CSE (2025-26 Placements Ongoing)", companies: "85", offers: "217", students: "200", avg: "20.32 LPA", max: "67 LPA" },
        full: [
            { name: "B.E. CSE (2024-25*)", companies: "91", offers: "190", students: "171", avg: "16.92 LPA", max: "67 LPA" },
            { name: "B.E. CSE (2023-24)", companies: "81", offers: "177", students: "166", avg: "15.81 LPA", max: "67 LPA" },
            { name: "B.E. CSE (2022-23)", companies: "103", offers: "225", students: "178", avg: "14.66 LPA", max: "48 LPA" },
            { name: "B.E. CSE (2021-22)", companies: "110", offers: "212", students: "179", avg: "14.12 LPA", max: "35.37 LPA" },
            { name: "B.E. CSE (2020-21)", companies: "95", offers: "202", students: "163", avg: "15.01 LPA", max: "32 LPA" }
        ]
    },
    'cs_ds': {
        name: "B.E. Computer Science And Engineering (Data Science)",
        ongoing: { name: "B.E. CSE Data Science (2025-26 Placements Ongoing)", companies: "42", offers: "55", students: "50", avg: "17.6 LPA", max: "40 LPA" }
    },
    'cs_cy': {
        name: "B.E. Computer Science And Engineering (Cyber Security)",
        ongoing: { name: "B.E. CSE Cyber Security (2025-26 Placements Ongoing)", companies: "45", offers: "51", students: "49", avg: "16.48 LPA", max: "35 LPA" }
    },
    'cs_aiml': {
        name: "B.E. Computer Science And Engineering (AIML)",
        ongoing: { name: "B.E. CSE AIML (2025-26 Placements Ongoing)", companies: "45", offers: "55", students: "53", avg: "18.17 LPA", max: "35 LPA" }
    },
    'cs_mtech': {
        name: "M.Tech. Computer Science & Engineering",
        ongoing: { name: "M.Tech. CSE (Placements Ongoing)", companies: "16", offers: "14", students: "14", avg: "19.21 LPA", max: "24 LPA" },
        full: [
            { name: "M.Tech. CSE (2024-25*)", companies: "16", offers: "14", students: "14", avg: "19.21 LPA", max: "24 LPA" },
            { name: "M.Tech. CSE (2023-24)", companies: "17", offers: "11", students: "11", avg: "15.13 LPA", max: "25 LPA" },
            { name: "M.Tech. CSE (2022-23)", companies: "14", offers: "15", students: "15", avg: "13.01 LPA", max: "26 LPA" },
            { name: "M.Tech. CSE (2021-22)", companies: "15", offers: "16", students: "16", avg: "11.05 LPA", max: "29.05 LPA" },
            { name: "M.Tech. CSE (2020-21)", companies: "Data unavailable", offers: "Data unavailable", students: "Data unavailable", avg: "Data unavailable", max: "Data unavailable" }
        ]
    },
    'cs_cne': {
        name: "M.Tech. Computer Network Engineering",
        ongoing: { name: "M.Tech. CNE (Placements Ongoing)", companies: "14", offers: "12", students: "12", avg: "13.02 LPA", max: "24 LPA" },
        full: [
            { name: "M.Tech. CNE (2024-25*)", companies: "14", offers: "12", students: "12", avg: "13.02 LPA", max: "24 LPA" },
            { name: "M.Tech. CNE (2023-24)", companies: "18", offers: "16", students: "16", avg: "5.76 LPA", max: "15 LPA" },
            { name: "M.Tech. CNE (2022-23)", companies: "13", offers: "14", students: "14", avg: "7.98 LPA", max: "16.24 LPA" },
            { name: "M.Tech. CNE (2021-22)", companies: "14", offers: "15", students: "15", avg: "8.57 LPA", max: "20 LPA" },
            { name: "M.Tech. CNE (2020-21)", companies: "Data unavailable", offers: "Data unavailable", students: "Data unavailable", avg: "Data unavailable", max: "Data unavailable" }
        ]
    },
'ae': {
        name: "Aerospace Engineering",
        ongoing: {
            name: "B.E. Aerospace Engineering (2025-26)",
            companies: 18, offers: 30, students: 30,
            avg: "8.12 LPA", max: "11.00 LPA"
        },
        'aiml': {
        name: "AI & Machine Learning",
        ongoing: {
            name: "B.E. AI & Machine Learning (2025-26)",
            companies: 47, offers: 63, students: 54,
            avg: "17.29 LPA", max: "53.00 LPA"
        },
        full: []
    },
        full: [
            { name: "2024-25", companies: 18, offers: 33, students: 28, avg: "7.02 LPA", max: "13.50 LPA" },
            { name: "2023-24", companies: 23, offers: 38, students: 33, avg: "6.83 LPA", max: "10.00 LPA" },
            { name: "2022-23", companies: 27, offers: 40, students: 33, avg: "7.60 LPA", max: "13.00 LPA" },
            { name: "2021-22", companies: 35, offers: 48, students: 44, avg: "7.83 LPA", max: "15.00 LPA" }
        ]
    },
'aiml': {
        name: "AI & Machine Learning",
        ongoing: {
            name: "B.E. AI & Machine Learning (2025-26)",
            companies: 47, offers: 63, students: 54,
            avg: "17.29 LPA", max: "53.00 LPA"
        },
        full: []
    },
'bt': {
        name: "Biotechnology",
        ug: {
            ongoing: {
                name: "B.E. in Biotechnology (2025-26)",
                companies: 5, offers: 8, students: 8,
                avg: "9.28 LPA", max: "14.81 LPA"
            },
            full: [
                { name: "2021-25", companies: 21, offers: 27, students: 27, avg: "4.75 LPA", max: "14.81 LPA" },
                { name: "2020-24", companies: "-", offers: 40, students: 40, avg: "5.49 LPA", max: "12.00 LPA" },
                { name: "2019-23", companies: "-", offers: 30, students: 30, avg: "5.42 LPA", max: "11.60 LPA" },
                { name: "2018-22", companies: "-", offers: 21, students: 21, avg: "5.42 LPA", max: "16.00 LPA" }
            ]
        },
        pg: {
            ongoing: {
                name: "M.Tech. in Biotechnology (2025-26)",
                companies: 6, offers: 14, students: 14,
                avg: "4.30 LPA", max: "5.50 LPA"
            },
            full: [
                { name: "2022-24", companies: "-", offers: 8, students: 8, avg: "3.35 LPA", max: "5.80 LPA" },
                { name: "2021-23", companies: "-", offers: 14, students: 14, avg: "3.80 LPA", max: "6.21 LPA" },
                { name: "2020-22", companies: "-", offers: 11, students: 11, avg: "3.50 LPA", max: "4.20 LPA" },
                { name: "2019-21", companies: "-", offers: 9, students: 9, avg: "3.00 LPA", max: "3.80 LPA" }
            ]
        }
    },
'ch': {
        name: "Chemical Engineering",
        ug: {
            ongoing: {
                name: "B.E. Chemical Engineering (2025-26)",
                companies: 10, offers: 21, students: 18,
                avg: "9.44 LPA", max: "18.33 LPA"
            },
            full: [
                { name: "2024-25", companies: 23, offers: 28, students: 28, avg: "6.69 LPA", max: "14.63 LPA" },
                { name: "2023-24", companies: 20, offers: 25, students: 25, avg: "6.78 LPA", max: "15.70 LPA" },
                { name: "2022-23", companies: 23, offers: 26, students: 21, avg: "7.70 LPA", max: "13.95 LPA" },
                { name: "2021-22", companies: 27, offers: 31, students: 26, avg: "7.14 LPA", max: "12.90 LPA" }
            ]
        }
    },
'cv': {
        name: "Civil Engineering",
        ug: {
            ongoing: {
                name: "B.E. Civil Engineering (2025-26)",
                companies: 14, offers: 38, students: 35,
                avg: "7.03 LPA", max: "18.33 LPA"
            },
            full: [
                { name: "2024-25", companies: 25, offers: 82, students: 77, avg: "5.52 LPA", max: "33.00 LPA" },
                { name: "2023-24", companies: 34, offers: 73, students: 71, avg: "5.11 LPA", max: "10.00 LPA" },
                { name: "2022-23", companies: 34, offers: 54, students: 50, avg: "6.72 LPA", max: "13.95 LPA" },
                { name: "2021-22", companies: 33, offers: 38, students: 38, avg: "6.39 LPA", max: "12.09 LPA" }
            ]
        },
        pg: {
            ongoing: [
                {
                    name: "M.Tech. Structural Engineering (2025-26)",
                    companies: 0, offers: 0, students: 0, avg: "0 LPA", max: "0 LPA"
                },
                {
                    name: "M.Tech. Highway Technology (2025-26)",
                    companies: 0, offers: 0, students: 0, avg: "0 LPA", max: "0 LPA"
                }
            ],
            full: [
                { name: "Structural Engg (2023-24)", companies: 6, offers: 10, students: 10, avg: "3.06 LPA", max: "6.00 LPA" },
                { name: "Structural Engg (2022-23)", companies: 6, offers: 7, students: 7, avg: "4.96 LPA", max: "6.00 LPA" },
                { name: "Structural Engg (2021-22)", companies: 6, offers: 7, students: 7, avg: "4.22 LPA", max: "5.00 LPA" },
                
                { name: "Highway Tech (2023-24)", companies: 8, offers: 13, students: 13, avg: "4.05 LPA", max: "7.00 LPA" },
                { name: "Highway Tech (2022-23)", companies: 9, offers: 12, students: 12, avg: "5.22 LPA", max: "6.00 LPA" },
                { name: "Highway Tech (2021-22)", companies: 7, offers: 11, students: 11, avg: "4.74 LPA", max: "5.03 LPA" }
            ]
        }
    },
'ec': {
        name: "Electronics & Communication Engineering",
        ug: {
            ongoing: {
                name: "B.E. Electronics & Communication Engg (2025-26)",
                companies: 65, offers: 148, students: 136,
                avg: "16.47 LPA", max: "37.00 LPA"
            },
            full: [
                { name: "2024-25", companies: 77, offers: 167, students: 156, avg: "13.40 LPA", max: "44.72 LPA" },
                { name: "2023-24", companies: 83, offers: 159, students: 152, avg: "11.27 LPA", max: "25.85 LPA" },
                { name: "2022-23", companies: 92, offers: 171, students: 161, avg: "12.12 LPA", max: "35.50 LPA" },
                { name: "2021-22", companies: 206, offers: 180, students: 152, avg: "8.40 LPA", max: "84.00 LPA" }
            ]
        },
        pg: {
            ongoing: [
                {
                    name: "M.Tech. VLSI Design & Embedded Systems (2025-26)",
                    companies: 23, offers: 29, students: 29, avg: "19.41 LPA", max: "35.00 LPA"
                },
                {
                    name: "M.Tech. Communication Systems (2025-26)",
                    companies: 9, offers: 6, students: 6, avg: "10.33 LPA", max: "15.00 LPA"
                }
            ],
            full: [
                { name: "VLSI Design & Embedded Systems (2024-25)", companies: 23, offers: 29, students: 29, avg: "19.41 LPA", max: "35.00 LPA" },
                { name: "VLSI Design & Embedded Systems (2023-24)", companies: 21, offers: 27, students: 27, avg: "11.97 LPA", max: "19.00 LPA" },
                { name: "VLSI Design & Embedded Systems (2022-23)", companies: 25, offers: 33, students: 33, avg: "16.18 LPA", max: "26.00 LPA" },
                { name: "VLSI Design & Embedded Systems (2021-22)", companies: 26, offers: 32, students: 32, avg: "12.75 LPA", max: "29.40 LPA" },

                { name: "Communication Systems (2024-25)", companies: 9, offers: 6, students: 6, avg: "10.33 LPA", max: "15.00 LPA" },
                { name: "Communication Systems (2023-24)", companies: 13, offers: 9, students: 9, avg: "7.06 LPA", max: "10.00 LPA" },
                { name: "Communication Systems (2022-23)", companies: 12, offers: 4, students: 4, avg: "8.46 LPA", max: "16.24 LPA" },
                { name: "Communication Systems (2021-22)", companies: 12, offers: 12, students: 12, avg: "8.05 LPA", max: "16.00 LPA" }
            ]
        }
    },
'ei': {
        name: "Electronics and Instrumentation Engineering",
        ug: {
            ongoing: {
                name: "B.E. Electronics and Instrumentation Engineering (2025-26)",
                companies: 27, offers: 53, students: 46,
                avg: "11.77 LPA", max: "37.00 LPA"
            },
            full: [
                { name: "2024-25", companies: 31, offers: 55, students: 51, avg: "9.28 LPA", max: "39.00 LPA" },
                { name: "2023-24", companies: 30, offers: 46, students: 43, avg: "9.29 LPA", max: "18.35 LPA" },
                { name: "2022-23", companies: 41, offers: 56, students: 45, avg: "9.59 LPA", max: "19.19 LPA" },
                { name: "2021-22", companies: 40, offers: 74, students: 54, avg: "11.11 LPA", max: "31.76 LPA" }
            ]
        }
    },
'is': {
        name: "Information Science and Engineering",
        ug: {
            ongoing: {
                name: "B.E. Information Science and Engineering (2025-26)",
                companies: 43, offers: 67, students: 57,
                avg: "19.11 LPA", max: "67.00 LPA"
            },
            full: [
                { name: "2024-25", companies: 55, offers: 71, students: 62, avg: "15.41 LPA", max: "67.00 LPA" },
                { name: "2023-24", companies: 51, offers: 61, students: 55, avg: "16.37 LPA", max: "92.00 LPA" },
                { name: "2022-23", companies: 63, offers: 73, students: 60, avg: "14.12 LPA", max: "62.00 LPA" },
                { name: "2021-22", companies: 67, offers: 74, students: 56, avg: "14.12 LPA", max: "32.50 LPA" }
            ]
        },
        pg: {
            ongoing: [
                {
                    name: "M.Tech. Software Engineering (2025-26)",
                    companies: 13, offers: 10, students: 10, avg: "15.18 LPA", max: "23.00 LPA"
                },
                {
                    name: "M.Tech. Information Technology (2025-26)",
                    companies: 14, offers: 9, students: 9, avg: "14.70 LPA", max: "21.00 LPA"
                }
            ],
            full: [
                { name: "Software Engineering (2024-25)", companies: 13, offers: 10, students: 10, avg: "15.18 LPA", max: "23.00 LPA" },
                { name: "Software Engineering (2023-24)", companies: 13, offers: 8, students: 8, avg: "7.95 LPA", max: "12.00 LPA" },
                { name: "Software Engineering (2022-23)", companies: 14, offers: 11, students: 11, avg: "10.00 LPA", max: "26.25 LPA" },
                { name: "Software Engineering (2021-22)", companies: 14, offers: 13, students: 13, avg: "9.10 LPA", max: "25.00 LPA" },

                { name: "Information Technology (2024-25)", companies: 14, offers: 9, students: 9, avg: "14.70 LPA", max: "21.00 LPA" },
                { name: "Information Technology (2023-24)", companies: 14, offers: 10, students: 10, avg: "5.65 LPA", max: "10.00 LPA" },
                { name: "Information Technology (2022-23)", companies: 14, offers: 7, students: 7, avg: "11.00 LPA", max: "19.00 LPA" },
                { name: "Information Technology (2021-22)", companies: 14, offers: 14, students: 14, avg: "10.95 LPA", max: "28.00 LPA" }
            ]
        }
    },
'ee': {
        name: "Electrical and Electronics Engineering",
        ug: {
            ongoing: {
                name: "B.E. Electrical and Electronics Engineering (2025-26)",
                companies: 31, offers: 40, students: 36,
                avg: "12.45 LPA", max: "30.00 LPA"
            },
            full: [
                { name: "2024-25", companies: 33, offers: 49, students: 43, avg: "10.26 LPA", max: "25.72 LPA" },
                { name: "2023-24", companies: 33, offers: 47, students: 44, avg: "8.83 LPA", max: "22.00 LPA" },
                { name: "2021-22", companies: 43, offers: 56, students: 49, avg: "10.24 LPA", max: "21.16 LPA" },
                { name: "2020-21", companies: 41, offers: 55, students: 50, avg: "10.49 LPA", max: "25.24 LPA" }
            ]
        },
        pg: {
            ongoing: {
                name: "M.Tech. Power Electronics (2025-26)",
                companies: 8, offers: 6, students: 6,
                avg: "6.83 LPA", max: "10.00 LPA"
            },
            full: [
                { name: "2023-24", companies: 14, offers: 11, students: 11, avg: "6.68 LPA", max: "18.00 LPA" },
                { name: "2021-22", companies: 13, offers: 12, students: 12, avg: "6.17 LPA", max: "9.00 LPA" },
                { name: "2020-21", companies: 17, offers: 17, students: 17, avg: "6.55 LPA", max: "16.00 LPA" }
            ]
        }
    },
'mca': {
        name: "Master of Computer Applications",
        pg: {
            ongoing: {
                name: "Master of Computer Applications (2025-26)",
                companies: 3, offers: 21, students: 22,
                avg: "4.00 LPA", max: "11.59 LPA"
            },
            full: [
                { name: "2025-26 (Timeline)", companies: 24, offers: 62, students: 59, avg: "9.00 LPA", max: "20.00 LPA" },
                { name: "2024-25", companies: 35, offers: 80, students: 80, avg: "8.94 LPA", max: "20.00 LPA" },
                { name: "2023-24", companies: 52, offers: 132, students: 95, avg: "8.29 LPA", max: "25.00 LPA" },
                { name: "2021-22", companies: 56, offers: 146, students: 102, avg: "10.00 LPA", max: "28.00 LPA" },
                { name: "2020-21", companies: 85, offers: 274, students: 210, avg: "7.50 LPA", max: "20.00 LPA" }
            ]
        }
    },
'me': {
        name: "Mechanical Engineering",
        ug: {
            ongoing: {
                name: "B.E. Mechanical Engineering (2025-26)",
                companies: 39, offers: 86, students: 80,
                avg: "9.22 LPA", max: "18.33 LPA"
            },
            full: [
                { name: "2024-25", companies: 44, offers: 88, students: 82, avg: "8.21 LPA", max: "18.33 LPA" },
                { name: "2023-24", companies: 46, offers: 78, students: 70, avg: "9.07 LPA", max: "18.00 LPA" },
                { name: "2022-23", companies: 60, offers: 113, students: 85, avg: "8.35 LPA", max: "16.00 LPA" },
                { name: "2021-22", companies: 45, offers: 112, students: 69, avg: "9.05 LPA", max: "18.00 LPA" }
            ]
        },
        pg: {
            ongoing: [
                {
                    name: "M.Tech. Product Design And Manufacturing (2025-26)",
                    companies: 6, offers: 8, students: 8, avg: "7.09 LPA", max: "14.00 LPA"
                },
                {
                    name: "M.Tech. Machine Design (2025-26)",
                    companies: 8, offers: 7, students: 7, avg: "6.02 LPA", max: "8.00 LPA"
                }
            ],
            full: [
                { name: "Product Design & Manufacturing (2024-25)", companies: 6, offers: 8, students: 8, avg: "7.09 LPA", max: "14.00 LPA" },
                { name: "Product Design & Manufacturing (2022-23)", companies: 12, offers: 23, students: 23, avg: "6.82 LPA", max: "10.00 LPA" },
                { name: "Product Design & Manufacturing (2021-22)", companies: 14, offers: 20, students: 20, avg: "6.45 LPA", max: "12.00 LPA" },

                { name: "Machine Design (2024-25)", companies: 8, offers: 7, students: 7, avg: "6.02 LPA", max: "8.00 LPA" },
                { name: "Machine Design (2022-23)", companies: 10, offers: 17, students: 17, avg: "6.44 LPA", max: "20.00 LPA" },
                { name: "Machine Design (2021-22)", companies: 12, offers: 15, students: 15, avg: "5.83 LPA", max: "12.00 LPA" }
            ]
        }
    },
'im': {
        name: "Industrial Engineering and Management",
        ug: {
            ongoing: {
                name: "B.E. Industrial Engineering and Management (2025-26)",
                companies: 12, offers: 30, students: 27,
                avg: "12.46 LPA", max: "21.45 LPA"
            },
            full: [
                { name: "2024-25", companies: 30, offers: 51, students: 46, avg: "7.68 LPA", max: "21.45 LPA" },
                { name: "2023-24", companies: 30, offers: 53, students: 51, avg: "8.39 LPA", max: "20.00 LPA" },
                { name: "2022-23", companies: 35, offers: 49, students: 49, avg: "9.06 LPA", max: "18.99 LPA" },
                { name: "2021-22", companies: 38, offers: 66, students: 42, avg: "9.03 LPA", max: "14.95 LPA" }
            ]
        }
    },
'et': {
        name: "Electronics And Telecommunication Engineering",
        ug: {
            ongoing: {
                name: "B.E. Electronics And Telecommunication Engineering (2025-26)",
                companies: 300, offers: 61, students: 47,
                avg: "11.128 LPA", max: "50.00 LPA"
            },
            full: [
                { name: "2024-25", companies: 41, offers: 53, students: 49, avg: "9.67 LPA", max: "39.00 LPA" },
                { name: "2023-24", companies: "N/A", offers: 45, students: 60, avg: "75% Placed", max: "12 Higher Studies" },
                { name: "2022-23", companies: "N/A", offers: 39, students: 64, avg: "61% Placed", max: "0 Higher Studies" },
                { name: "2021-22", companies: "N/A", offers: 48, students: 60, avg: "80% Placed", max: "0 Higher Studies" },
                { name: "2020-21", companies: "N/A", offers: 47, students: 54, avg: "87% Placed", max: "1 Higher Studies" }
            ]
        },
        pg: {
            ongoing: {
                name: "M.Tech. Digital Communication Engineering (2025-26)",
                companies: 1, offers: 1, students: 1,
                avg: "15.00 LPA", max: "15.00 LPA"
            },
            full: [
                { name: "2024-25*", companies: 1, offers: 1, students: 1, avg: "15.00 LPA", max: "15.00 LPA" },
                { name: "2023-24", companies: 12, offers: 8, students: 8, avg: "7.50 LPA", max: "10.00 LPA" },
                { name: "2021-22", companies: 12, offers: 11, students: 11, avg: "7.09 LPA", max: "18.60 LPA" },
                { name: "2020-21", companies: 16, offers: 22, students: 22, avg: "8.22 LPA", max: "21.50 LPA" }
            ]
        }
    }
};

// Human-readable labels for suggestion buttons
const INTENT_LABELS = {
    greet:'Say Hi 👋', bye:'Bye!', about_disambiguation:'About 🤔', about_rvce:'About RVCE 🏫', about_rvei:'About RVEI (RSST) 🏛️', hostels:'Hostels 🏠',
    transport:'How to Reach 🚌', wifi:'WiFi 📶', food:'Food & Canteen 🍛',
    exam:'Exams 📝', lateral:'Lateral Entry', nri:'NRI / International',
    scholarships:'Scholarships 🎓', jee:'JEE Info', examTypes:'KCET / COMED-K',
    contact:'Contact 📞', menu:'Main Menu 📋',
    dept_cs:'Computer Science & Engineering (CSE)', dept_aiml:'AI & Machine Learning (AIML)', dept_ec:'Electronics & Communication (ECE)',
    dept_me:'Mechanical Engineering (ME)', dept_cv:'Civil Engineering (CV)', dept_ee:'Electrical & Electronics (EEE)',
    dept_ae:'Aerospace Engineering (AE)', dept_bt:'Biotechnology (BT)', dept_ch:'Chemical Engineering (CH)',
    dept_is:'Information Science (ISE)', dept_csds:'Data Science (CSDS)', dept_cscy:'Cyber Security (CSCY)',
    dept_et:'Telecommunication (ETE)', dept_ei:'Instrumentation (EIE)', dept_im:'Industrial Engineering (IEM)',
    syllabus_1st_sem: '1st Year Syllabus 📚', dress_code: 'Dress Code 👔', anti_ragging: 'Anti-Ragging 🛑', hod_cs: 'CSE HOD 👨‍🏫',
    safety: 'Campus Safety 🛡️', attendance: 'Attendance Rules 📋', roi: 'Value for Money 💎', girls_hostel: 'Girls Hostel 🏠',
    nearby: 'Nearby Areas 📍', internship: 'Internships 🧑‍💻', startup: 'Startups & E-Cell 🚀', peer_quality: 'Peer Quality 🎯',
    worth_it: 'Is RVCE Worth It? ⭐', best_branch: 'Best Branch 🔝', parking: 'Parking & Vehicles 🅿️', part_time: 'Part-time Work 💼',
    committees: 'Statutory Committees 🏛️', policies: 'Policies & Documents 📜',
    alumni: 'Alumni Network 🤝', college_compare: 'College Comparison 📊',
    centres_of_excellence:'Centres of Excellence 🔬', collaborations:'Industry Partnerships 🤝', health_centre:'Health Facilities 🏥', iqac:'IQAC 📋',
    professional_societies:'Student Societies 🤝', upcoming_events:'Upcoming Events 📅',
    ncc:'NCC 🇮🇳', nss:'NSS 🤝', mandatory_disclosure:'Mandatory Disclosure 📄',
    kannada_sangha:'Kannada Sangha 🎭', rvjsteam:'RVJ STEAM Team 🎨', calendar_events:'Academic Calendar 📅',
    circulars: 'Circulars & Notifications 📢', notifications: 'Circulars & Notifications 📢', management_quota: 'Management Quota 💰', cutoffs: 'Cutoffs & Ranks 📊', fees: 'Fee Structure 💵',
    refund_policy: 'Refund Policy 💸', innovationTeams: 'Innovation Teams 💡', culturalLife: 'Cultural Life 🎭', vision: 'Vision & Mission 🎯',
    principal: 'Principal 👨‍🏫', vice_principal: 'Vice Principal 👩‍🏫', faculty: 'Faculty & Deans 👨‍🏫', deans_list: 'Deans List 📋', hods_list: 'HODs List 👩‍🏫',
    ranking: 'Rankings & NIRF 🏆', accreditation: 'Accreditation 💎', timings: 'College Timings ⏰', trust: 'RSST Trust 🏛️',
    research: 'Research & R&D 🔬', dept_mca: 'MCA Department 💻', phd: 'PhD Programs 🧪', vtu: 'VTU Affiliation 🏛️',
    intake: 'Student Intake 🎓', library: 'Central Library 📚', sports: 'Sports & Athletics 🏅', autonomous: 'Autonomous Status 📜',
    stats_disambiguation: 'College Statistics 📊', placements: 'Placements 💼', admissions: 'Admissions 🎓', departments: 'All Departments 📚',
    ug_disambiguation: 'UG Details 🎓', ugPrograms: 'UG Programs (B.E.) 📜', pgPrograms: 'PG Programs (M.Tech) 📘', facilities: 'Facilities & Infra 🏢',
    website: 'Official Website 🌐', campusLife: 'Campus Life 🏕️', germany_program: 'Indo-German Programs 🇩🇪'
};

// 2.6 Update INTENT_LABELS for dynamic intents (ensures "Did you mean?" shows pretty names)
branchHodIntents.forEach(di => {
    const c = di.id.replace('hod_', '');
    const d = KB.departments.ug.find(x=>x.c===c) || KB.departments.pg.find(x=>x.c===c);
    if (d) INTENT_LABELS[di.id] = d.n + " HOD 👨‍🏫";
});
branchPlacementIntents.forEach(di => {
    const c = di.id.replace('plcmt_', '');
    const d = KB.departments.ug.find(x=>x.c===c) || KB.departments.pg.find(x=>x.c===c);
    if (d) INTENT_LABELS[di.id] = d.n + " Placements 💼";
});
branchIntakeIntents.forEach(di => {
    const c = di.id.replace('intake_', '');
    const d = KB.departments.ug.find(x=>x.c===c) || KB.departments.pg.find(x=>x.c===c);
    if (d) INTENT_LABELS[di.id] = d.n + " Intake & Accreditation 🎓";
});
// Populate Faculty Labels
if (KB.faculty) {
    Object.keys(KB.faculty).forEach(dept => {
        KB.faculty[dept].forEach(fac => {
            const full = fac.n.toLowerCase();
            const slug = full.replace(/[^a-z0-9]/g, '');
            INTENT_LABELS[`fac_${slug}`] = fac.n;
        });
    });
}
// Populate COE Labels dynamically from coes_db
if (KB.general.coes_db) {
    KB.general.coes_db.forEach(coe => {
        INTENT_LABELS[coe.id] = coe.emoji + ' ' + coe.n;
    });
}

const ABBR = {
    'prgm': 'ugPrograms', 'prgms': 'ugPrograms', 'prog': 'ugPrograms',
    'dept': 'departments', 'depts': 'departments',
    'adm': 'admissions', 'adms': 'admissions',
    'plcmnt': 'placements', 'plcmnts': 'placements',
    'hstl': 'hostels', 'hostl': 'hostels',
    'schly': 'scholarships',
    'syll': 'syllabus_1st_sem', 'sylly': 'syllabus_1st_sem',
    'infra': 'facilities', 'amenities': 'facilities',
    'mgmt': 'management_quota',
    'execs': 'deans_list',
    'princi': 'principal',
    'vp': 'vice_principal',
    'cult': 'culturalLife',
    'inno': 'innovationTeams',
    'soc': 'professional_societies',
    'alum': 'alumni',
    'fee': 'fees',
    'exam': 'exam',
    'res': 'research',
    'place': 'placements'
};

// Returns { type: 'exact'|'keyword'|'fuzzy'|null, id: string|null, suggestions: string[] }
function classifyIntent(input) {
    let cleanInput = sanitize(input).toLowerCase();

    // Extract requested year if any (e.g., 2024, 2023)
    let extractedYear = null;
    let extractedYears = [];
    const yearMatches = cleanInput.match(/\b20\d{2}(?:-\d{2})?\b/g);
    if (yearMatches) {
        extractedYears = Array.from(new Set(yearMatches));
        extractedYear = extractedYears.join(' & ');
    }

    // --- Wire up NLP Tokenizer (Ignore grammar/stop words for robust matching) ---
    const nlpData = processNLPInput(cleanInput);
    cleanInput = nlpData.cleanString;
    // -----------------------------------------------------------------------------

    // 0. Placement Regex Override (Detect Year-wise Dept Placements early)
    let pMatch = /(?:placement stats|placement statistics|placement|placements|highest package|average package|salary)\s+(?:for|in|of)?\s*([a-zA-Z\s\(\)]+)/i.exec(cleanInput);
    if (!pMatch) pMatch = /([a-zA-Z\s\(\)]+)\s+(?:placement stats|placement statistics|placement|placements|highest package|average package|salary)/i.exec(cleanInput);
    
    if (pMatch) {
        let extractedDept = pMatch[1].trim();
        // Remove common stop words from dept name
        extractedDept = extractedDept.replace(/\b(engineering|technology|department|dept)\b/gi, '').trim();
        
        const matched = KB.departments.ug.find(x => x.c === extractedDept) ||
                        KB.departments.pg.find(x => x.c === extractedDept) ||
                        KB.departments.ug.find(x => x.n.toLowerCase().startsWith(extractedDept)) ||
                        KB.departments.pg.find(x => x.n.toLowerCase().startsWith(extractedDept)) ||
                        KB.departments.ug.find(x => x.n.toLowerCase().includes(extractedDept)) ||
                        KB.departments.pg.find(x => x.n.toLowerCase().includes(extractedDept));
        if (matched) {
            return { type: 'exact', id: 'plcmt_' + matched.c, year: extractedYear, suggestions: [] };
        }
    }

    // Context Memory: Implicitly inject department if requested contextually
    const contextualTopics = ['placement', 'hod', 'faculty', 'labs', 'syllabus', 'research'];
    let strippedInput = cleanInput;
    if (typeof SESSION !== 'undefined' && SESSION.lastIntent && SESSION.lastIntent.startsWith('dept_')) {
        const hasTopic = contextualTopics.some(t => cleanInput.includes(t));
        const hasDeptMention = cleanInput.match(/\b(cse|cs|ece|ec|mech|civil|aiml|ai|ml|ise|eee|ee|biotech|bt|chemical|ch|cv|aerospace|ae|eie|ei|ete|et|mca|csds|cscy)\b/i);
        const hasGlobalRole = cleanInput.match(/director|dean|officer|principal|vice principal|incharge|head of placement/i);
        if (hasTopic && !hasDeptMention && !hasGlobalRole) {
            const branchCode = SESSION.lastIntent.replace('dept_', '');
            cleanInput += ` ${branchCode}`;
        }
    }
    
    // Remove common stop words for more robust matching of separated keywords (excluding 'is' and 'me' to avoid dept collisions)
    const stopWords = ['the', 'for', 'a', 'an', 'of', 'in', 'to', 'and', 'with', 'about', 'on', 'at', 'please', 'can', 'you', 'tell', 'know'];
    strippedInput = cleanInput.split(' ').filter(w => !stopWords.includes(w)).join(' ');

    // 0. Abbreviation Check
    if (ABBR[cleanInput]) return { type: 'fuzzy', id: null, year: extractedYear, suggestions: [ABBR[cleanInput]]  };

    // 0.5 Context-aware multi-turn handling
    const contextIntents = ['_more','_back','_what_else','_yes','_no'];
    for (const q of QA) {
        if (contextIntents.includes(q.id) && q.k.includes(cleanInput)) {
            return { type: 'context', id: q.id, year: extractedYear, suggestions: []  };
        }
    }
    
    // 1. Universal Button-to-Intent Bypass — these are BUTTONS the user clicked, always exact
    for (const [id, label] of Object.entries(INTENT_LABELS)) {
        if (sanitize(label).toLowerCase() === cleanInput) return { type: 'exact', id, suggestions: [] };
    }
    for (const d of KB.departments.ug) {
        if (sanitize(d.n).toLowerCase() === cleanInput) return { type: 'exact', id: 'dept_' + d.c, year: extractedYear, suggestions: []  };
    }
    for (const d of KB.departments.pg) {
        if (sanitize(d.n).toLowerCase() === cleanInput) return { type: 'exact', id: 'dept_' + d.c, year: extractedYear, suggestions: []  };
    }
    const BUTTON_MAP = {
        'ug be': 'ugAdm', 'pg mtech': 'pgAdm', 'mca': 'mca', 'phd': 'phd',
        'view programs': 'ugPrograms', 'pg programs': 'pgPrograms', 'all departments': 'departments',
        'admissions page': 'admissions', 'apply': 'admissions',
        'placement details': 'placements', 'more info': 'admissions',
        'facilities': 'facilities', 'all facilities': 'facilities',
        'innovation teams': 'innovationTeams', 'see teams': 'innovationTeams',
        'cultural clubs': 'culturalLife', 'cultural teams': 'culturalLife',
        'sports info': 'sports', 'rvei website': 'trust',
        'website': 'website', 'email': 'contact', 'rvce edu in': 'website'
    };
    if (BUTTON_MAP[cleanInput]) return { type: 'exact', id: BUTTON_MAP[cleanInput], year: extractedYear, suggestions: []  };

    // 2. Exact match: user typed EXACTLY a keyword from the QA bank
    for (const q of QA) {
        if (q.k.includes(cleanInput)) return { type: 'exact', id: q.id, year: extractedYear, suggestions: []  };
    }

    // 3. Keyword-in-sentence: a keyword appears as a whole word inside user's input
    let best = null, bestP = 99, bestL = 0;
    const matchedIntents = [];
    const intentIndices = {};

    for (const q of QA) {
        for (const k of q.k) {
            const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp('(?:^|\\s)' + escapedK + '(?=\\s|$)', 'i');
            
            let isMatch = regex.test(cleanInput) || regex.test(strippedInput);
            
            // Fuzzy Matching for typos on single keywords > 4 chars
            const wordCount = strippedInput.split(' ').length;
            if (!isMatch && k.length > 4 && !k.includes(' ') && wordCount < 15) {
                const words = strippedInput.split(' ');
                for (const w of words) {
                    if (w.length > 4) {
                        const dist = levenshtein(w, k);
                        // Allow 1 typo for words 5-7 chars, 2 typos for 8+ chars
                        if (dist <= 1 || (k.length > 7 && dist <= 2)) {
                            isMatch = true; break;
                        }
                    }
                }
            }
            
            if (isMatch) {
                const idx = cleanInput.indexOf(k.toLowerCase());
                
                // --- NEGATION DETECTION ---
                if (idx !== -1) {
                    const precedingText = cleanInput.substring(Math.max(0, idx - 20), idx);
                    if (/\b(not|no|don't|dont|without|excluding|except)\b/i.test(precedingText)) {
                        continue;
                    }
                }

                matchedIntents.push(q);
                
                if (!(q.id in intentIndices)) intentIndices[q.id] = cleanInput.length;
                if (idx !== -1 && idx < intentIndices[q.id]) intentIndices[q.id] = idx;

                if (q.p < bestP || (q.p === bestP && k.length > bestL)) {
                    best = q.id; bestP = q.p; bestL = k.length;
                }
            }
        }
    }

    // 2.5 Faculty Override (Prioritize specific faculty matches over generic keywords)
    const facultyId = findFacultyMatch(input);
    if (facultyId) {
        return { type: 'exact', id: facultyId, year: extractedYear, suggestions: []  };
    }

    // Composite Intent Resolution: Combine Department + Topic (e.g., CSE + Placements)
    let isComposite = false;
    if (matchedIntents.length > 1) {
        const matchedIds = matchedIntents.map(q => q.id);
        // Prioritize specific composite matches if already found before overriding
        const existingComposite = matchedIds.find(id => id.startsWith('plcmt_') || id.startsWith('hod_'));
        
        if (existingComposite) {
            best = existingComposite;
            isComposite = true;
        } else {
            const deptMatches = matchedIds.filter(id => id.startsWith('dept_')).sort((a, b) => b.length - a.length);
            const deptMatch = deptMatches[0];
            
            if (deptMatch) {
                const branchCode = deptMatch.replace('dept_', '');
                if (matchedIds.includes('placements') || cleanInput.includes('placement')) {
                    best = `plcmt_${branchCode}`;
                    isComposite = true;
                } else if (matchedIds.includes('career_options_menu') || cleanInput.includes('career') || cleanInput.includes('jobs') || cleanInput.includes('future')) {
                    best = `career_${branchCode}`;
                    isComposite = true;
                } else if (matchedIds.includes('hods_list') || matchedIds.includes('faculty') || cleanInput.includes('hod')) {
                    best = `hod_${branchCode}`;
                    isComposite = true;
                } else if (matchedIds.includes('syllabus_1st_sem') || cleanInput.includes('syllabus') || cleanInput.includes('labs')) {
                    best = `dept_${branchCode}`;
                    isComposite = true;
                }
            }
        }
    }

    // Multi-Intent Resolution: if not a composite, check for multiple distinct major intents
    if (matchedIntents.length > 1 && !isComposite) {
        // Sort chronologically based on where the keyword appeared in the text
        matchedIntents.sort((a, b) => intentIndices[a.id] - intentIndices[b.id]);

        const uniqueIds = Array.from(new Set(matchedIntents.map(q => q.id)));
        const topIntents = uniqueIds
            .map(id => QA.find(q => q.id === id))
            .filter(q => q && q.p < 4 && q.id !== 'departments' && q.id !== 'about_disambiguation');
            
        if (topIntents.length > 1) {
            const allIds = topIntents.map(q => q.id);
            const multiIds = allIds.slice(0, 1);
            const overflowIds = allIds.slice(1);
            
            if (matchedIntents.some(q => q.id === 'greet')) {
                if (!multiIds.includes('greet')) multiIds.unshift('greet');
            }
            
            return { type: 'multi', ids: multiIds, overflow: overflowIds, year: extractedYear, suggestions: []  };
        }
    }

    if (best) {
        // Auto-map Department + Year directly to Placement stats (e.g., "ETE 2023" -> ETE Placements 2023)
        if (extractedYear && best.startsWith('dept_')) {
            best = best.replace('dept_', 'plcmt_');
            isComposite = true; // Upgrade to exact match confidence
        }

        if (matchedIntents.some(q => q.id === 'greet') && best !== 'greet') {
            return { type: 'multi', ids: ['greet', best], year: extractedYear, suggestions: [] };
        }
        return { type: isComposite ? 'exact' : 'keyword', id: best, year: extractedYear, suggestions: []  };
    }

    // 3.5 COE alias matching — check if user query contains any COE alias
    if (KB.general.coes_db) {
        let bestCoe = null, bestCoeLen = 0;
        const strippedInput = cleanInput.replace(/\b(tell me about|what is|show me|info on|information about|details about|about the|about|the|coe|centre of excellence|center of excellence|in rvce)\b/gi, '').trim();
        for (const coe of KB.general.coes_db) {
            for (const alias of coe.aliases) {
                if (strippedInput === alias || cleanInput.includes(alias) || strippedInput.includes(alias)) {
                    if (alias.length > bestCoeLen) {
                        bestCoe = coe.id;
                        bestCoeLen = alias.length;
                    }
                }
            }
        }
        if (bestCoe) return { type: 'exact', id: bestCoe, year: extractedYear, suggestions: []  };
    }

    // 4. Ultra-Aggressive Faculty Search (Move to secondary fallback)

    if (KB.faculty) {
        const cleanText = cleanInput.replace(/\b(view|profile|of|show|who|is|details|faculty|professor|teacher|dr|prof|mr|ms|mrs|assistant|associate|head|department|dept)\b/g, '').replace(/[^a-z]/g, '').trim();
        const s = cleanText.length >= 3 ? cleanText : cleanInput.replace(/[^a-z]/g, '');
        if (s.length >= 3) {
            const facultyMatches = [];
            for (const deptCode in KB.faculty) {
                for (const fac of KB.faculty[deptCode]) {
                    const fn = fac.n.toLowerCase().replace(/[^a-z]/g, '');
                    const pn = fac.n.replace(/Dr\.|Prof\.|Mr\.|Assistant Prof/gi, '').toLowerCase().replace(/[^a-z]/g, '');
                    
                    if (fn.includes(s) || pn.includes(s) || s.includes(pn)) {
                        facultyMatches.push({f: fac, d: deptCode});
                    }
                }
            }
            
            if (facultyMatches.length === 1) {
                const fac = facultyMatches[0].f;
                const finalId = `fac_${fac.n.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                return { type: 'exact', id: finalId, year: extractedYear, suggestions: []  };
            } else if (facultyMatches.length > 1) {
                return { type: 'fac_multi', matches: facultyMatches, year: extractedYear, suggestions: [] };
            }
        }
    }

    // 5. Fuzzy match: no exact keyword found, try "Did you mean?" suggestions
    const suggestions = findSuggestions(input);
    if (suggestions.length > 0) return { type: 'fuzzy', id: null, year: extractedYear, suggestions };

    // 5. No match at all
    return { type: null, id: null, year: extractedYear, suggestions: []  };
}

// Legacy wrapper for tests and button clicks (returns just the ID)
function matchIntent(input) {
    const result = classifyIntent(input);
    return result.id || null;
}

/* =============== FUZZY "DID YOU MEAN?" =============== */
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({length: m+1}, ()=> Array(n+1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]!==b[j-1]?1:0));
    return dp[m][n];
}

function findSuggestions(input) {
    const words = sanitize(input).toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const scored = new Map();
    for (const q of QA) {
        if (q.id === 'greet' || q.id === 'bye' || q.id === 'menu') continue;
        let minDist = Infinity;
        for (const k of q.k) {
            for (const w of words) {
                // Check each keyword and each word from input
                const kWords = k.split(/\s+/);
                for (const kw of kWords) {
                    if (kw.length < 3) continue;
                    const d = levenshtein(w, kw);
                    const threshold = Math.max(1, Math.floor(kw.length * 0.35));
                    if (d <= threshold && d < minDist) minDist = d;
                }
            }
        }
        if (minDist < Infinity) scored.set(q.id, minDist);
    }
    // Sort by distance, return top 3 unique
    const sorted = [...scored.entries()].sort((a,b) => a[1]-b[1]);
    const results = [];
    const seen = new Set();
    for (const [id] of sorted) {
        if (!seen.has(id) && results.length < 3) { results.push(id); seen.add(id); }
    }
    return results;
}

function getFollowUps(id) {
    const map = {
        ugPrograms: [{l:'Admissions info',a:'admissions',i:'🎓'},{l:'Campus Life',a:'campusLife',i:'🏕️'}],
        placements: [{l:'Top Companies',a:'top_companies',i:'🏢'},{l:'Admissions',a:'admissions',i:'🎓'}],
        hostels: [{l:'Boys Hostel',a:'hostels',i:'👨'},{l:'Girls Hostel',a:'girls_hostel',i:'👩'},{l:'Mess Info',a:'mess',i:'🍲'},{l:'Nearby Areas',a:'nearby',i:'📍'}],
        admissions: [{l:'Fee Structure',a:'fees',i:'💰'},{l:'Placements',a:'placements',i:'💼'}],
        mess: [{l:'Hostels',a:'hostels',i:'🏠'},{l:'Food Court',a:'food',i:'🍛'}],
        food: [{l:'Hostels',a:'hostels',i:'🏠'},{l:'Mess Info',a:'mess',i:'🍲'}],
        wifi: [{l:'Hostels',a:'hostels',i:'🏠'},{l:'Facilities',a:'facilities',i:'🏢'}],
        transport: [{l:'Nearby Areas',a:'nearby',i:'📍'},{l:'Contact',a:'contact',i:'📞'}],
        exam: [{l:'Academic Calendar',a:'calendar_events',i:'📅'},{l:'Syllabus',a:'syllabus_1st_sem',i:'📚'}],
        intake: [{l:'Admissions',a:'admissions',i:'🎓'},{l:'Departments',a:'departments',i:'📚'}],
        timings: [{l:'Contact',a:'contact',i:'📞'},{l:'Transport',a:'transport',i:'🚌'}],
        dress_code: [{l:'Campus Life',a:'campusLife',i:'🏕️'},{l:'Anti-Ragging',a:'anti_ragging',i:'🛑'}],
        attendance: [{l:'Exams',a:'exam',i:'📝'},{l:'Calendar',a:'calendar_events',i:'📅'}],
        parking: [{l:'Transport',a:'transport',i:'🚌'},{l:'Nearby',a:'nearby',i:'📍'}],
        vtu: [{l:'Autonomous Status',a:'autonomous',i:'📜'},{l:'Exams',a:'exam',i:'📝'}],
        autonomous: [{l:'VTU Affiliation',a:'vtu',i:'🏛️'},{l:'Syllabus',a:'syllabus_1st_sem',i:'📚'}],
        ranking: [{l:'Placements',a:'placements',i:'💼'},{l:'Accreditation',a:'accreditation',i:'💎'}],
        vision: [{l:'About RVCE',a:'about_rvce',i:'🏫'},{l:'Principal',a:'principal',i:'👨‍🏫'},{l:'Vice Principal',a:'vice_principal',i:'👩‍🏫'}],
        refund_policy: [{l:'Fee Structure',a:'fees',i:'💰'},{l:'Admissions',a:'admissions',i:'🎓'}]
    };
    return map[id] || [];
}

/* =============== MULTI-TURN CONTEXT HELPERS =============== */
function getDeepInfo(lastId) {
    const r = { text:'', buttons:[], noMenu:false };
    const deepMap = {
        'placements': () => {
            r.text = T("Here's the full breakdown! 📊","Detailed Placement Information:");
            r.text += "\n\n**2025 Batch (B.E.):**\n• Highest: " + KB.placements.maxSalary + "\n• Average: " + KB.placements.avgSalary + "\n• " + KB.placements.companies + "\n• " + KB.placements.offers + "\n• Infrastructure: " + KB.placements.infra + "\n• Scholarships: " + KB.placements.scholarships;
            r.text += "\n\n**M.Tech/MCA (2025):**\n• M.Tech highest: " + KB.placements2025.mtechMax + "\n• MCA highest: " + KB.placements2025.mcaMax;
            r.text += "\n\n**Previous Year (2024):**\n• Highest: " + KB.placements2024.maxSalary + "\n• " + KB.placements2024.companies + "\n• " + KB.placements2024.offers;
            r.text += "\n\n**Top Recruiters:**\n" + KB.placements.recruiters;
            r.buttons = [{l:'Placement Page',u:KB.placements.url,i:'🌐'},{l:'Admissions',a:'admissions',i:'🎓'}];
        },
        'admissions': () => {
            r.text = T("Ready to join the RVCE family? 🎓 Here's the admission lowdown:","Admission Information:");
            r.text += T("\n\n• **B.E. Programs**: Via KCET, COMEDK, or Management Quota.\n• **M.Tech/MCA**: Based on PGCET or GATE scores.\n• **Research**: Ph.D./M.Sc. by research via VTU regulations.\n\nRequired documents usually include 10th/12th marks cards, entrance rank cards, and transfer certificates.","\n\n• Undergraduate (B.E.): KCET / COMEDK / Management Quota\n• Post-Graduate (M.Tech/MCA): GATE / PGCET\n• Research: Ph.D via VTU\n\nFor current fee structures and seat availability, visit the official admission portal.");
            r.buttons = [{l:'UG (B.E.)',a:'ugAdm',i:'🎓'},{l:'PG (M.Tech/MCA)',a:'pgAdm',i:'📖'},{l:'Research (Ph.D)',a:'phd',i:'🔬'},{l:'Official Portal',u:'https://rvce.edu.in/admissions/',i:'🌐'}];
        },
        'about_rvce': () => {
            r.text = T("Let me tell you everything about RVCE! 🏫","Complete RVCE Overview:");
            r.text += "\n\n• **Name:** " + KB.general.name + "\n• **Established:** " + KB.general.est + "\n• **Campus:** " + KB.general.campus + "\n• **Trust:** " + KB.general.trust + "\n• **Status:** " + KB.general.status + "\n• **Accreditation:** " + KB.general.accreditation + "\n• **Ranking:** " + KB.general.ranking + "\n• **Principal:** " + KB.general.principal + "\n• **Vice Principal:** " + KB.general.vicePrincipal + "\n• **Vision:** " + KB.general.vision + "\n• **Research:** " + KB.general.research + "\n• **Intake:** " + KB.general.intake + "\n• **Industry Partners:** " + KB.general.industryPartners.join(', ');
            r.buttons = [{l:'Rankings',a:'ranking',i:'🏆'},{l:'Research',a:'research',i:'🔬'},{l:'Website',u:'https://rvce.edu.in/about_us/',i:'🌐'}];
        },
        'hostels': () => {
            r.text = T("Here's the full hostel scoop! 🏠","Complete Hostel Details:");
            r.text += "\n\n**Boys Blocks:**";
            Object.entries(KB.hostelDetails.boysBlocks).forEach(([k,v]) => { r.text += "\n• " + k.charAt(0).toUpperCase()+k.slice(1) + ": " + v; });
            r.text += "\n\n**Girls Blocks:**";
            Object.entries(KB.hostelDetails.girlsBlocks).forEach(([k,v]) => { r.text += "\n• " + k.charAt(0).toUpperCase()+k.slice(1) + ": " + v; });
            r.text += "\n\n**Hostel Fees:** For hostel fee details, please contact the hostel administration or the admissions office.";
            r.text += "\n\n**Facilities:** " + KB.hostelDetails.facilities;
            r.buttons = [{l:'Girls Hostel',a:'girls_hostel',i:'🏠'},{l:'Campus Safety',a:'safety',i:'🛡️'}];
        },
        'departments': () => {
            r.text = T("RVCE has departments across multiple levels! 📚","Department Overview:");
            r.text += "\n\n**UG Programs (B.E.):** " + KB.departments.ug.length + " departments\n**PG Programs (M.Tech/MCA):** " + KB.departments.pg.length + " programs\n**PhD:** Available in all departments with 15 VTU-recognized Research Centres";
            r.text += "\n\n**Top Departments:**\n• CSE — HOD: Dr. Shanta Rangaswamy\n• AIML — Program Coordinator: Dr. Deepamala N\n• ECE — HOD: Dr. Ravish Aradhya H V\n• ISE — HOD: Dr. Mamatha G S\n• ME — HOD: Dr. Shanmukha Nagaraj";
            r.buttons = [{l:'UG Programs',a:'ugPrograms',i:'🎓'},{l:'PG Programs',a:'pgPrograms',i:'📘'},{l:'All HODs',a:'hods_list',i:'👩‍🏫'}];
        },
        'research': () => {
            r.text = T("RVCE's research game is next level! 🔬","Detailed Research Information:");
            r.text += "\n\n• " + KB.general.research + "\n• Research Domains: " + KB.general.researchDomains;
            r.text += "\n\n**Top Centres of Excellence:**\n• " + KB.general.coes.slice(0, 5).join("\n• ") + `\n\n*...and ${KB.general.coes.length - 5} more CoEs!*`;
            r.text += "\n\n**Centres of Competence:**\n• " + KB.general.cocs.join("\n• ");
            r.buttons = [{l:'See All CoEs 🔬',a:'more_coes',i:'🧪'},{l:'Research Page',u:'https://rvce.edu.in/research_consulting/',i:'🌐'}];
        },
        'campusLife': () => {
            r.text = T("Campus life at RVCE is EPIC! 🎉","Detailed Campus Life:");
            r.text += "\n\n**Cultural Clubs (" + KB.campus.clubs.length + "):**\n• " + KB.campus.clubs.join("\n• ");
            r.text += "\n\n**Innovation Teams (" + KB.campus.teams.length + "):**\n• " + KB.campus.teams.join("\n• ");
            r.text += "\n\n**Professional Societies:**\n• " + KB.campus.societies.join("\n• ");
            r.text += "\n\n**Annual Fest:** " + KB.campus.fest;
            r.buttons = [{l:'Innovation Teams',u:KB.campus.urls.innovation,i:'🚀'},{l:'Cultural Teams',u:KB.campus.urls.cultural,i:'🎭'}];
        },
        'contact': () => {
            r.text = T("Here's every way to reach RVCE! 📞","Complete Contact Information:");
            r.text += "\n\n• **Address:** " + KB.contact.address + "\n• **Phone:** " + KB.contact.phone + "\n• **Admissions:** " + KB.contact.admissionPhone + "\n• **Placement Cell:** " + KB.contact.placementPhone + "\n• **Email:** " + KB.contact.email + "\n• **Website:** " + KB.contact.website + "\n• **Timings:** " + KB.general.timings;
            r.buttons = [{l:'Website',u:KB.contact.website,i:'🌐'},{l:'Contact Page',u:'https://rvce.edu.in/contact-us/',i:'📞'}];
        },
        'fees': () => {
            r.text = T("For detailed fee information, please refer to the official Admission Circulars! 📄","Fee Information:");
            r.text += "\n\nPlease check the Admission Circulars for the latest fee structure, payment details, and related information.";
            r.text += "\n\n**Hostel Fees:** For hostel fee details, please contact the hostel administration.";
            r.text += "\n\n**Refund Policy:** AICTE rules apply — full refund (-₹1k processing) before commencement.";
            r.buttons = [{l:'Admission Circulars',u:'https://rvce.edu.in/admission-circulars/',i:'📄'}];
        }
    };
    if (deepMap[lastId]) { deepMap[lastId](); return r; }
    // For department-specific intents
    if (lastId && lastId.startsWith('dept_')) {
        const c = lastId.replace('dept_','');
        const d = KB.departments.ug.find(x=>x.c===c) || KB.departments.pg.find(x=>x.c===c);
        if (d) {
            r.text = T("Here's everything about " + d.n + "! 📚","Detailed Department Information: " + d.n);
            r.text += "\n\n• **HOD:** " + (d.hod || 'N/A');
            if (d.info) r.text += "\n• **About:** " + d.info;
            r.text += "\n\nExplore all department resources below:";
            r.buttons = [{l:'Main Page',u:d.u,i:'🌐'}];
            if (d.about) r.buttons.push({l:'About',u:d.about,i:'ℹ️'});
            if (d.syllabus) r.buttons.push({l:'Syllabus',u:d.syllabus,i:'📚'});
            if (d.faculty) r.buttons.push({l:'Faculty',u:d.faculty,i:'👨‍🏫'});
            if (d.placement) r.buttons.push({l:'Placements',u:d.placement,i:'💼'});
            if (d.labs) r.buttons.push({l:'Labs',u:d.labs,i:'🧪'});
            if (d.facilities) r.buttons.push({l:'Facilities',u:d.facilities,i:'🏢'});
            if (d.research) r.buttons.push({l:'Research',u:d.research,i:'🔬'});
            if (d.campus_diaries) r.buttons.push({l:'Campus Diaries',u:d.campus_diaries,i:'📔'});
            if (d.hod_url) r.buttons.push({l:'HOD Profile',u:d.hod_url,i:'👨‍🏫'});
            if (d.hod_message) r.buttons.push({l:'HOD Message',u:d.hod_message,i:'✉️'});
            if (d.happenings) r.buttons.push({l:'News & Happenings',u:d.happenings,i:'🗞️'});
            if (d.m_tech) r.buttons.push({l:'M.Tech Program',u:d.m_tech,i:'📘'});
            if (d.m_tech_cne) r.buttons.push({l:'M.Tech CNE',u:d.m_tech_cne,i:'🌐'});
            if (d.m_tech_structural) r.buttons.push({l:'M.Tech Structural Engg',u:d.m_tech_structural,i:'🏗️'});
            if (d.m_tech_highway) r.buttons.push({l:'M.Tech Highway Tech',u:d.m_tech_highway,i:'🛣️'});
            if (d.m_tech_vlsi) r.buttons.push({l:'M.Tech VLSI & Embedded',u:d.m_tech_vlsi,i:'📟'});
            if (d.m_tech_comm) r.buttons.push({l:'M.Tech Comm Systems',u:d.m_tech_comm,i:'📡'});
            if (d.m_tech_soft) r.buttons.push({l:'M.Tech Software Engg',u:d.m_tech_soft,i:'💻'});
            if (d.m_tech_it) r.buttons.push({l:'M.Tech IT',u:d.m_tech_it,i:'🌐'});
            if (d.m_tech_pdm) r.buttons.push({l:'M.Tech PDM',u:d.m_tech_pdm,i:'🎨'});
            if (d.m_tech_machine) r.buttons.push({l:'M.Tech Machine Design',u:d.m_tech_machine,i:'⚙️'});
            if (d.coe) r.buttons.push({l:'CoE',u:d.coe,i:'🔬'});
            if (d.coe_mfc) r.buttons.push({l:'CoE Materials Fabrication',u:d.coe_mfc,i:'🔬'});
            if (d.coe_cav) r.buttons.push({l:'CoE Connected Vehicles',u:d.coe_cav,i:'🚗'});
            if (d.coe_icas) r.buttons.push({l:'CoE Integrated Circuits',u:d.coe_icas,i:'📟'});
            if (d.coe_cisss) r.buttons.push({l:'CoE Cognitive Systems',u:d.coe_cisss,i:'🧠'});
            if (d.coe_vision) r.buttons.push({l:'CoE Computer Vision',u:d.coe_vision,i:'👁️'});
            if (d.coe_toyota) r.buttons.push({l:'CoE Toyota Automotive',u:d.coe_toyota,i:'🚗'});
            if (d.coe_ev) r.buttons.push({l:'CoE MG Electric Vehicles',u:d.coe_ev,i:'⚡'});
            if (d.coe_3s) r.buttons.push({l:'CoE 3S Infrastructure',u:d.coe_3s,i:'🏗️'});
            if (d.coe_logistics) r.buttons.push({l:'CoE Logistics & SCM',u:d.coe_logistics,i:'🚚'});
            if (d.coe_genomics) r.buttons.push({l:'CoE Computational Genomics',u:d.coe_genomics,i:'🧬'});
            if (d.coe_hydrogen) r.buttons.push({l:'CoE Hydrogen & Green Tech',u:d.coe_hydrogen,i:'🔋'});
            if (d.coe_mobility) r.buttons.push({l:'CoE e-Mobility',u:d.coe_mobility,i:'🚲'});
            if (d.coe_vidyuth) r.buttons.push({l:'CoE Smart Vidyuth',u:d.coe_vidyuth,i:'⚡'});
            if (d.coc_ev) r.buttons.push({l:'CoC EV Academy',u:d.coc_ev,i:'🚗'});
            if (d.coe_sensor) r.buttons.push({l:'CoE Sensor Technology',u:d.coe_sensor,i:'📡'});
            if (d.coe_health) r.buttons.push({l:'CoE Health Care Tech',u:d.coe_health,i:'🏥'});
            if (d.coe_5g) r.buttons.push({l:'CoE 5G Wireless Tech',u:d.coe_5g,i:'📡'});
            if (d.coe_wic) r.buttons.push({l:'CoE Women in Cloud',u:d.coe_wic,i:'☁️'});
            if (d.coe_quantum) r.buttons.push({l:'CoE Quantum Information',u:d.coe_quantum,i:'⚛️'});
            if (d.coe_nano) r.buttons.push({l:'CoE Nanomaterials',u:d.coe_nano,i:'🔬'});
            if (d.coe_bosch) r.buttons.push({l:'CoE RV-Bosch Automation',u:d.coe_bosch,i:'⚙️'});
            if (d.coe_benz) r.buttons.push({l:'CoE Mercedes Benz Mechatronics',u:d.coe_benz,i:'🏎️'});
            if (d.coe_sasm) r.buttons.push({l:'CoE Smart Antennas',u:d.coe_sasm,i:'📡'});

            if (d.rd_labs) r.buttons.push({l:'R&D Labs',u:d.rd_labs,i:'🧪'});
            if (d.networking) r.buttons.push({l:'Collaboration & Networking',u:d.networking,i:'🤝'});
            if (d.scholarship) r.buttons.push({l:'Sports Scholarship',u:d.scholarship,i:'🏆'});
            if (d.tournaments) r.buttons.push({l:'VTU Tournaments',u:d.tournaments,i:'🏅'});
            return r;
        }
    }
    // For specific COE intents (coe_mfc, coe_cisss, etc.)
    if (lastId && lastId.startsWith('coe_')) {
        const coe = KB.general.coes_db.find(c => c.id === lastId);
        if (coe) {
            r.text = T(
                `${coe.emoji} **${coe.n}**\n\n${coe.info}`,
                `${coe.emoji} ${coe.n}\n\nDepartment: ${coe.dept}${coe.partner ? '\nIndustry Partner: ' + coe.partner : ''}\n\n${coe.info}`
            );
            r.text += `\n\n• **Department:** ${coe.dept}`;
            if (coe.partner) r.text += `\n• **Industry Partner:** ${coe.partner}`;
            if (coe.year) r.text += `\n• **Established:** ${coe.year}`;
            r.buttons = [
                {l:`Visit CoE Page 🌐`, u: coe.url, i:'🌐'},
                {l:'All CoEs 🔬', a:'centres_of_excellence', i:'🔬'},
                {l:'Research Home 📚', a:'research', i:'📚'}
            ];
            // Add related COEs from same department
            const relatedCoes = KB.general.coes_db.filter(c => c.id !== lastId && c.dept === coe.dept).slice(0,2);
            relatedCoes.forEach(rc => r.buttons.push({l: rc.emoji + ' ' + rc.n.split('(')[0].trim(), a: rc.id, i: rc.emoji}));
            return r;
        }
    }
    return null;
}

function getRelatedTopics(lastId) {
    const r = { text:'', buttons:[], noMenu:false };
    const relatedMap = {
        'placements': ['admissions','fees','departments','best_branch','internship','alumni'],
        'admissions': ['fees','placements','departments','hostels','scholarships','cutoffs'],
        'about_rvce': ['ranking','accreditation','research','vision','principal','vice_principal','about_rvei'],
        'hostels': ['facilities','food','safety','girls_hostel','nearby','transport'],
        'departments': ['ugPrograms','pgPrograms','placements','research','centres_of_excellence'],
        'campusLife': ['culturalLife','innovationTeams','sports','upcoming_events','ncc','nss'],
        'fees': ['admissions','refund_policy','hostels','management_quota'],
        'contact': ['transport','nearby','timings','website'],
        'research': ['centres_of_excellence','departments','phd'],
        'ranking': ['accreditation','about_rvce','college_compare'],
        'safety': ['hostels','girls_hostel','anti_ragging','health_centre'],
        'culturalLife': ['innovationTeams','sports','upcoming_events','campusLife'],
        'innovationTeams': ['culturalLife','research','startup','campusLife']
    };
    const related = relatedMap[lastId] || ['admissions','placements','departments','campusLife','hostels'];
    r.text = T("Here are some related topics you might like! 🔗","Related topics you can explore:");
    r.buttons = related.slice(0,5).map(id => ({ l: INTENT_LABELS[id] || id, a: id, i: '🔍' }));
    return r;
}

/* =============== TONE HELPER =============== */
function T(f, p) { return tone === 'funny' ? f : p; }

/* =============== RESPONSE GENERATOR =============== */
function findFacultyBySlug(slug) {
    if (!KB.faculty) return null;
    for (const dept in KB.faculty) {
        for (const f of KB.faculty[dept]) {
            const fSlug = f.n.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (fSlug === slug) return { f: f, d: dept };
        }
    }
    return null;
}

function getResponse(id) {
    const r = { text: '', buttons: [], noMenu: false };
    
    // Dynamic Faculty Lookup
    if (id && id.startsWith('fac_')) {
        const match = findFacultyBySlug(id.replace('fac_', ''));
        if (match) return renderFaculty(match.f, match.d);
    }

    // Add conversational prefix for non-greeting/bye intents
    if (id !== 'greet' && id !== 'bye' && id !== 'menu') {
        r.text = getPrefix();
    }

    SESSION.lastIntent = id;

    switch (id) {
    case 'greet':
        r.text = T("Hey there! 👋 Welcome to RVCE — the place where engineers are crafted! 🔧 What would you like to know?","Hello! Welcome to RV College of Engineering. How can I assist you today?");
        r.noMenu = true; return r;
    case 'bye':
        r.text = T("See ya! 🙌 Hope I helped. Come back anytime!","Thank you for visiting. Feel free to return anytime. Have a good day!");
        r.buttons = [{l:'Visit Website',u:KB.contact.website,i:'🌐'}]; return r;
    case 'about':
    case 'about_disambiguation':
        r.text = T(
            "Are you looking for information about Departments, the RV Educational Institutions (RVEI), or RV College of Engineering (RVCE)?",
            "Please clarify what you would like to know about:"
        );
        r.buttons = [
            {l:'Departments 📚', a:'departments', i:'📚'},
            {l:'About RVEI 🏛️', a:'about_rvei', i:'🏛️'},
            {l:'About RVCE 🏫', a:'about_rvce', i:'🏫'}
        ];
        r.noMenu = true;
        break;
    case 'about_rvei':
        r.text += T("Rashtreeya Vidyalaya Educational Institutions (RVEI) is managed by RSST! 🏛️","About RVEI (RSST):");
        r.text += "\n• "+KB.rvei.history+"\n• "+KB.rvei.institutions+"\n• Motto: "+KB.rvei.motto;
        r.buttons = [{l:'RVEI Website',u:'https://rvinstitutions.com/',i:'🌐'},{l:'About RVCE',a:'about_rvce',i:'🏫'}];
        break;
    case 'about_rvce':
        r.text += T("RVCE — engineering excellence since 1963! 🔧\n📍 16.85 acres on Mysuru Road, Bengaluru\n🏆 NAAC A+ (3.39/4.0) | NIRF 101-150\n🎓 16 UG + 14 PG programs\n📄 100+ Patents | 30+ Centres of Excellence",
            "RV College of Engineering, established in 1963, is situated on 16.85 acres on Mysuru Road, Bengaluru.\n\n• Accreditation: NAAC A+ Grade (CGPA 3.39/4.0, valid 2024-2029)\n• Ranking: NIRF 101-150, #1 Private College (IIRF 2025)\n• Programs: 16 B.E., 14 M.Tech/MCA, PhD\n• Research: 100+ Patents, 30+ Centres of Excellence");
        r.buttons = [{l:'Rankings',a:'ranking',i:'🏆'},{l:'Vision & Mission',a:'vision',i:'🎯'},{l:'Research',a:'research',i:'🔬'},{l:'Website',u:'https://rvce.edu.in/about_us/',i:'🌐'}]; break;
    case 'vision':
        r.text += T("RVCE's vision? Tech + Innovation + Sustainability = Future! 🚀","Vision: "+KB.general.vision); break;
    case 'principal':
        r.text += T("Dr. K.N. Subramanya is the Principal! An accomplished academician, researcher, and administrator with over 34 years of experience! ⚓",
            "The Principal of RVCE is Dr. K.N. Subramanya.");
        r.text += "\n\n🌟 **Profile:** An accomplished academician and administrator who fosters innovation and excellence with strong leadership and team-building skills.\n📌 **Department:** Industrial Engineering & Management (IEM)\n🎓 **Qualification:** B.E. (Ind & Prod), M.Tech (Ind Mgmt), MBA (HR), Ph.D. (Supply Chain)\n📚 **Experience:** 34+ years in teaching, research & administration\n📧 **Email:** subramanyakn@rvce.edu.in";
        r.buttons = [{l:'About Principal 👨‍🏫',u:'https://rvce.edu.in/about-k_n_subramanya/',i:'👨‍🏫'}, {l:'Vice Principal 👩‍🏫',a:'vice_principal',i:'👩‍🏫'}]; break;
    case 'vice_principal':
        r.text += T("Dr. K. S. Geetha is our Vice-Principal! A powerhouse of academic excellence! 👩‍🏫",
            "The Vice-Principal of RVCE is Dr. K. S. Geetha.\n\nShe is a Professor in the ECE department and handles academic and administrative responsibilities alongside the Principal.\n\nContact: [viceprincipal@rvce.edu.in](mailto:viceprincipal@rvce.edu.in)");
        r.buttons = [{l:'About Vice Principal',u:'https://rvce.edu.in/department/ece/dr_k_s_geetha/',i:'👩‍🏫'}, {l:'Principal',a:'principal',i:'👨‍🏫'}]; break;
    case 'ranking':
        r.text += T("RVCE is killing it! 🏆","RVCE Rankings:");
        r.text += "\n• "+KB.general.ranking+"\n• "+KB.general.accreditation; break;
    case 'accreditation':
        r.text += T("RVCE scored the top marks! 💎","Accreditation Details:");
        r.text += "\n• "+KB.general.accreditation+"\n• "+KB.general.status;
        r.buttons = [{l:'NAAC Portal',u:'https://rvce.edu.in/naac/',i:'🌐'}]; break;
    case 'timings':
        r.text += T("⏰ "+KB.general.timings,"College timings: "+KB.general.timings); break;
    case 'trust':
        r.text += T("RVCE is powered by RSST! 🏛️","RVCE is managed by "+KB.general.trust+".");
        r.buttons = [{l:'RVEI Website',u:'https://rvei.edu.in/',i:'🌐'}]; break;
    case 'research':
        r.text += T("Research at RVCE is 🔥!","Research Highlights:");
        r.text += "\n• "+KB.general.research+"\n• Domains: "+KB.general.researchDomains;
        r.buttons = [{l:'Centres of Excellence 🔬',a:'centres_of_excellence',i:'🧪'},{l:'Research Centres',u:'https://rvce.edu.in/research_consulting/',i:'🌐'}]; break;
    case 'centres_of_excellence':
        r.text += T("RVCE has 20+ Centres of Excellence (CoEs)! 🔬 World-class research hubs with global industry partners:\n\n💡 *Tip: Search a specific CoE by name to see details & direct page link!*","Centres of Excellence (COEs) at RVCE:\n\nTip: Search a specific CoE name to get its description and direct page link.");
        r.text += "\n\n" + KB.general.coes_db.slice(0, 5).map((c,i) =>
            `${i+1}. ${c.emoji} **${c.n}** — *${c.dept}*`
        ).join('\n');
        r.text += `\n\n*...and ${KB.general.coes_db.length - 5} more CoEs!*`;
        r.buttons = [
            {l:'See All CoEs ➕',a:'more_coes',i:'➕'},
            {l:'Boston AI CoE 🧠',a:'coe_boston',i:'🧠'},
            {l:'CISSS CoE 🤖',a:'coe_cisss',i:'🤖'},
            {l:'Full CoE Page 🌐',u:'https://rvce.edu.in/research_consulting/centre-of-excellence/',i:'🌐'}
        ]; break;
    case 'more_coes':
        r.text += T("Here is the complete list of all Centres of Excellence at RVCE! 🔬","Complete List of Centres of Excellence:");
        r.text += "\n\n" + KB.general.coes_db.map((c,i) =>
            `${i+1}. ${c.emoji} **${c.n}** — *${c.dept}*`
        ).join('\n');
        r.text += "\n\n**Industry Competence Centres (CoCs):**\n• " + KB.general.cocs.join("\n• ");
        r.buttons = [
            {l:'Back 🔙',a:'_back',i:'🔙'},
            {l:'Full CoE Page 🌐',u:'https://rvce.edu.in/research_consulting/centre-of-excellence/',i:'🌐'}
        ]; break;
    case 'collaborations':
    case 'partnerships':
        r.text += T("RVCE is a hub for industry tie-ups! 🤝 We have 200+ MoUs with global giants:","Industry Collaborations & MoUs:");
        r.text += "\n\n• **Boston UK**: CoE in AI Research with 1-PetaFLOP computing power 🧠\n• **Tata Technologies**: CIIIT Center for Industry 4.0 and Smart Manufacturing (₹60 Cr project).\n• **Cisco**: Networking Academy and IoT CoE.\n• **MG Motor**: EV Technology skill development.\n• **Mercedes-Benz**: ADAM (Automotive Mechatronics) diploma program.\n• **Toyota Kirloskar**: Automotive Engineering centre.\n• **IBM**: Software & Cloud CoE.\n• **Research Partners**: ISRO, CSIR-NAL, Indian Navy, Boeing, and Airbus.";
        r.buttons = [{l:'Boston AI CoE',a:'boston',i:'🧠'},{l:'Centres of Excellence',a:'centres_of_excellence',i:'🔬'},{l:'Placements',a:'placements',i:'💼'}]; break;
    case 'boston':
        r.text += T("The **RVCE-Boston CoE in AI Research** is a beast! 🧠🔋\n\nIt was built with **Boston Ltd., UK** and features a **Graphcore POD4 server** with 1-PetaFLOP of AI power! It's one of the few in India.","Centre of Excellence in AI Research (RVCE-Boston Ltd):");
        r.text += "\n\n• **Focus**: Computer Vision, FinTech, AgriTech, and BioTech research.\n• **Certification**: Offers a 6-month professional course in Data Science & MLOps.\n• **Consultancy**: Invites industry projects and algorithm testing for scholars.\n• **Impact**: Bridges the gap between academic theory and real-world AI deployment.";
        r.buttons = [{l:'AI Research Home',u:'https://rvce.edu.in/department/wp-content/uploads/2026/03/RVCE-Boston-AI-CoE2.pdf',i:'🌐'},{l:'All Collaborations',a:'collaborations',i:'🤝'}]; break;
    case 'germany_program':
        r.text += T("RVCE has strong ties with Germany! 🇩🇪 We offer several Indo-German programs and host German-partnered Centres of Excellence:", "RVCE's Indo-German Collaborations:");
        r.text += "\n\n**Academic Programs:**\n• **Indo-German Certificate Programme**: In collaboration with Technical University of Applied Sciences Würzburg-Schweinfurt (THWS) and other Bavarian universities.\n• Focuses on preparing students for higher education and careers in Germany.";
        r.text += "\n\n**German-Partnered CoEs:**\n• **RV-Mercedes Benz Centre (ADAM)**: Advanced Diploma in Automotive Mechatronics.\n• **RV-Bosch Rexroth Centre**: Automation, hydraulics, and pneumatics.";
        r.buttons = [{l:'Mercedes Benz CoE 🏎️',a:'coe_benz',i:'🏎️'},{l:'Bosch Rexroth CoE ⚙️',a:'coe_bosch',i:'⚙️'},{l:'All Collaborations 🤝',a:'collaborations',i:'🤝'}];
        break;
    case 'admissions':
        r.text += T("Let's get you enrolled! 🎓","Admission Information:");
        r.buttons = [{l:'UG (B.E.)',a:'ugAdm',i:'🎓'},{l:'PG (M.Tech)',a:'pgAdm',i:'📘'},{l:'MCA',a:'mca',i:'💻'},{l:'PhD',a:'phd',i:'🧪'},{l:'Admissions Page',u:KB.admissions.url,i:'🌐'}]; break;
    case 'ugAdm':
        r.text += T("B.E. admission details 📋:","UG Admission:");
        r.text += "\n• Eligibility: "+KB.admissions.ug.eligibility+"\n• Exams: "+KB.admissions.ug.exams+"\n• "+KB.admissions.ug.quotas;
        r.buttons = [{l:'View Programs',a:'ugPrograms',i:'📋'},{l:'Apply',u:KB.admissions.url,i:'🌐'}]; break;
    case 'notifications':
    case 'circulars':
        r.text += T("Looking for the latest updates? 📢 Check out the official circulars below!","Please select the type of circular you are looking for:");
        r.buttons = [
            {l:'Admission Circulars',u:KB.circulars.admissions,i:'🎓'},
            {l:'Exam Circulars',u:KB.circulars.examinations,i:'📝'},
            {l:'Academic Circulars',u:KB.circulars.academic,i:'📚'},
            {l:'Fee Payment Circulars',u:'https://rvce.edu.in/academics_and_examinations/fee_payment_circulars/',i:'💰'}
        ]; break;
    case 'committees':
        r.text += T("Here are the top Statutory Committees at RVCE! 🏛️","Statutory Committees at RVCE:");
        r.text += "\n\n• **Governing Body**: Strategic oversight\n• **Academic Council**: Academic planning\n• **Board of Studies**: Curriculum design";
        r.buttons = [
            {l:'Governing Body PDF',u:'https://rvce.edu.in/wp-content/uploads/2025/10/RVCE.pdf',i:'📄'},
            {l:'Academic Council PDF',u:'https://rvce.edu.in/wp-content/uploads/2025/10/AC-Members-List-2025-26.pdf',i:'📄'},
            {l:'View All Committees 🌐',u:'https://rvce.edu.in/statutory-committees/',i:'🌐'}
        ]; break;
    case 'policies':
        r.text += T("Here are some of the key Policies and Documents for RVCE! 📜","Key Policies & Documents:");
        r.text += "\n\n• **Mandatory Disclosure**: Official college data\n• **Strategic Planning**: Long-term goals\n• **Code of Conduct**: Rules & guidelines";
        r.buttons = [
            {l:'Mandatory Disclosure',u:'https://rvce.edu.in/mandatory-disclosure/',i:'📄'},
            {l:'Code of Conduct PDF',u:'https://rvce.edu.in/wp-content/uploads/2025/09/Code-of-conduct.pdf',i:'📄'},
            {l:'View All Policies 🌐',u:'https://rvce.edu.in/about_us/policies-documents/',i:'🌐'}
        ]; break;
    case 'pgAdm':
        r.text += T("M.Tech time! 🚀","PG Admission:");
        r.text += "\n• Eligibility: "+KB.admissions.pg.eligibility+"\n• Exams: "+KB.admissions.pg.exams;
        r.buttons = [{l:'PG Programs',a:'pgPrograms',i:'📋'},{l:'Apply (M.Tech/MCA)',u:'https://rvce.edu.in/admissions/#mtechmca_link',i:'🌐'}]; break;
    case 'jee':
        r.text += T("⚠️ JEE Mains is NOT accepted at RVCE! You need KCET, COMED-K, or Management Quota.","Important: JEE Mains scores are NOT considered for RVCE admission. Accepted exams: KCET (KEA), COMED-K, and Management Quota.");
        r.buttons = [{l:'Admission Info',a:'admissions',i:'🎓'}]; break;
    case 'examTypes':
        r.text += T("Ways to get in 🎯:","Admission Modes:");
        r.text += "\n• KCET (KEA) — Karnataka entrance\n• COMED-K — Private colleges\n• Management Quota\n• Special: CIWG/PIO/OCI/Nepal";
        r.buttons = [{l:'More Info',u:KB.admissions.url,i:'🌐'}]; break;
    case 'management_quota':
        r.text += T("Management Quota Seats 💰:","Management Quota Information:");
        r.text += "\n• Admission is based on academic performance and seat availability.\n• For detailed fee information, please refer to the Admission Circulars.";
        r.buttons = [{l:'Admission Circulars',u:'https://rvce.edu.in/admission-circulars/',i:'📄'},{l:'Contact Admissions',a:'contact',i:'📞'},{l:'Admissions Page',u:KB.admissions.url,i:'🌐'}]; break;
    case 'cutoffs':
        r.text += T("Rankings & Cutoffs 📊:","KCET/COMEDK Cutoffs:");
        r.text += "\n• "+KB.admissions.cutoffs+"\n• Note: Cutoffs vary significantly by year and category.";
        r.buttons = [{l:'KEA Website',u:'https://cetonline.karnataka.gov.in/kea/',i:'🌐'},{l:'Admissions Info',a:'admissions',i:'🎓'}]; break;
    case 'scholarships':
        r.text += T("Scholarships & Aid 🎓:","Financial Support:");
        r.text += "\n• "+KB.placements.scholarships;
        r.buttons = [{l:'More Details',u:'https://rvce.edu.in/scholarships/',i:'🌐'}]; break;
    case 'lateral':
        r.text += T("Lateral Entry (Diploma) 🔄:","Admission for Diploma Holders:");
        r.text += "\n• Direct admission to 2nd year B.E.\n• Mandatory Requirement: DCET (Diploma CET) rank.";
        r.buttons = [{l:'Admissions Page',u:KB.admissions.url,i:'🌐'}]; break;
    case 'fees':
        r.text += T("For detailed fee information, please refer to the official Admission Circulars! 📄",
            "Fee Information: Please check the Admission Circulars for the latest fee structure, payment schedules, and related details.");
        r.buttons = [
            {l:'Admission Circulars',u:'https://rvce.edu.in/admission-circulars/',i:'📄'},
            {l:'Admissions Info',a:'admissions',i:'🎓'}
        ]; break;
    case 'contact':
    case 'address':
    case 'location':
        r.text += T("You can find us here! 📍","Official Contact Details:");
        r.text += "\n\n**Address:**\n" + KB.contact.address;
        r.text += "\n\n**Phone:**\n" + KB.contact.phone;
        r.text += "\n\n**Email:**\n[" + KB.contact.email.split(':')[1] + "](" + KB.contact.email + ")";
        r.buttons = [
            {l:'View on Maps',u:KB.contact.maps,i:'📍'},
            {l:'Contact Page',u:'https://rvce.edu.in/contact-us/',i:'📞'},
            {l:'Follow Us 📱',a:'social',i:'📱'},
            {l:'Main Menu',a:'menu',i:'📋'}
        ]; break;
    case 'social':
        r.text += T("Stay connected with RVCE! 🌐 Follow our official social media handles for the latest updates, events, and campus news.","Official RVCE Social Media Handles:");
        r.buttons = [
            {l:'Facebook',u:KB.contact.social.facebook,i:'📘'},
            {l:'Instagram',u:KB.contact.social.instagram,i:'📸'},
            {l:'LinkedIn',u:KB.contact.social.linkedin,i:'🔗'},
            {l:'X (Twitter)',u:KB.contact.social.x,i:'🐦'},
            {l:'Contact Details',a:'contact',i:'📞'}
        ]; break;
    case 'placements_yearly':
        if (typeof SESSION !== 'undefined' && SESSION.reqYear) {
            r.text += T(`You asked for placement statistics for the year **${SESSION.reqYear}**. Which program level would you like to view? 📊`, `Select a program level to view placement statistics for ${SESSION.reqYear}:`);
        } else {
            r.text += T("Which program level's year-wise placement statistics would you like to view? 📊", "Select a program level for year-wise placement statistics:");
        }
        r.buttons = [
            {l:'UG Programs (B.E.) 🎓',a:'plcmt_ug_categories',i:'🎓'},
            {l:'PG Programs (M.Tech/MCA) 🎓',a:'plcmt_pg_categories',i:'🎓'},
            {l:'Overall 2026 Placements',a:'placements',i:'💼'}
        ]; break;
    case 'dept_placements_list':
        r.text += T("Explore our department-wise placement statistics! 📊 Select Program Level:", "Department-wise Placement Statistics - Select Level:");
        r.buttons = [
            {l:'UG Programs (B.E.) 🎓',a:'plcmt_ug_categories',i:'🎓'},
            {l:'PG Programs (M.Tech/MCA) 🎓',a:'plcmt_pg_categories',i:'🎓'},
            {l:'Back to Placements',a:'placements',i:'🔙'}
        ]; break;
    case 'plcmt_ug_categories':
        r.text += T("UG Placement Statistics! 📊 Choose a category:", "UG Placement Statistics - Select a category:");
        r.buttons = [
            {l:'Computing & IT 💻',a:'plcmt_group_comp_ug',i:'💻'},
            {l:'Electrical & Comm 🔌',a:'plcmt_group_elec_ug',i:'🔌'},
            {l:'Core Engineering ⚙️',a:'plcmt_group_core_ug',i:'⚙️'},
            {l:'Back',a:'dept_placements_list',i:'🔙'}
        ];
        r.noMenu = true; break;
    case 'plcmt_pg_categories':
        r.text += T("PG Placement Statistics! 📊 Choose a category:", "PG Placement Statistics - Select a category:");
        r.buttons = [
            {l:'Computing & IT 💻',a:'plcmt_group_comp_pg',i:'💻'},
            {l:'Electrical & Comm 🔌',a:'plcmt_group_elec_pg',i:'🔌'},
            {l:'Core Engineering ⚙️',a:'plcmt_group_core_pg',i:'⚙️'},
            {l:'MCA 💻',a:'plcmt_mca_pg',i:'💻'},
            {l:'Back',a:'dept_placements_list',i:'🔙'}
        ];
        r.noMenu = true; break;

    case 'plcmt_cs_ug':
        r.text += T("Select a B.E. CSE Specialization:", "B.E. CSE Placements - Select Specialization:");
        r.buttons = [
            {l:'CSE Core',a:'cs_spec_cs_core',i:'💻'},
            {l:'Data Science',a:'cs_spec_cs_ds',i:'📊'},
            {l:'Cyber Security',a:'cs_spec_cs_cy',i:'🔒'},
            {l:'AIML',a:'cs_spec_cs_aiml',i:'🤖'},
            {l:'Back',a:'plcmt_group_comp_ug',i:'🔙'}
        ];
        r.noMenu = true; break;
    case 'plcmt_cs_pg':
        r.text += T("Select an M.Tech CSE Specialization:", "M.Tech CSE Placements - Select Specialization:");
        r.buttons = [
            {l:'M.Tech CSE',a:'cs_spec_cs_mtech',i:'💻'},
            {l:'M.Tech Computer Network Engg',a:'cs_spec_cs_cne',i:'🌐'},
            {l:'Back',a:'plcmt_group_comp_pg',i:'🔙'}
        ];
        r.noMenu = true; break;

    case 'plcmt_group_comp_ug':
        r.text += T("Computing & IT (UG) Placement Stats:", "Computing & IT (UG) Placement Statistics:");
        r.buttons = [
            {l:'CSE 💻',a:'plcmt_cs_ug',i:'💻'},
            {l:'ISE 💻',a:'plcmt_is_ug',i:'💻'},
            {l:'AIML 🤖',a:'plcmt_aiml_ug',i:'🤖'},
            {l:'Back',a:'plcmt_ug_categories',i:'🔙'}
        ];
        r.noMenu = true; break;
    case 'plcmt_group_elec_ug':
        r.text += T("Electrical & Communication (UG) Placement Stats:", "Electrical & Communication (UG) Placement Statistics:");
        r.buttons = [
            {l:'ECE 📡',a:'plcmt_ec_ug',i:'📡'},
            {l:'EEE 🔌',a:'plcmt_ee_ug',i:'🔌'},
            {l:'Telecom 📶',a:'plcmt_et_ug',i:'📶'},
            {l:'Instrumentation 🎛️',a:'plcmt_ei_ug',i:'🎛️'},
            {l:'Back',a:'plcmt_ug_categories',i:'🔙'}
        ];
        r.noMenu = true; break;
    case 'plcmt_group_core_ug':
        r.text += T("Core Engineering (UG) Placement Stats:", "Core Engineering (UG) Placement Statistics:");
        r.buttons = [
            {l:'Mechanical ⚙️',a:'plcmt_me_ug',i:'⚙️'},
            {l:'Aerospace ✈️',a:'plcmt_ae_ug',i:'✈️'},
            {l:'Civil 🏗️',a:'plcmt_cv_ug',i:'🏗️'},
            {l:'Chemical 🧪',a:'plcmt_ch_ug',i:'🧪'},
            {l:'BioTech 🧬',a:'plcmt_bt_ug',i:'🧬'},
            {l:'Industrial (IEM) 🏭',a:'plcmt_im_ug',i:'🏭'},
            {l:'Back',a:'plcmt_ug_categories',i:'🔙'}
        ];
        r.noMenu = true; break;

    case 'plcmt_group_comp_pg':
        r.text += T("Computing & IT (PG) Placement Stats:", "Computing & IT (PG) Placement Statistics:");
        r.buttons = [
            {l:'CSE 💻',a:'plcmt_cs_pg',i:'💻'},
            {l:'ISE 💻',a:'plcmt_is_pg',i:'💻'},
            {l:'Back',a:'plcmt_pg_categories',i:'🔙'}
        ];
        r.noMenu = true; break;
    case 'plcmt_group_elec_pg':
        r.text += T("Electrical & Communication (PG) Placement Stats:", "Electrical & Communication (PG) Placement Statistics:");
        r.buttons = [
            {l:'ECE 📡',a:'plcmt_ec_pg',i:'📡'},
            {l:'EEE 🔌',a:'plcmt_ee_pg',i:'🔌'},
            {l:'Back',a:'plcmt_pg_categories',i:'🔙'}
        ];
        r.noMenu = true; break;
    case 'plcmt_group_core_pg':
        r.text += T("Core Engineering (PG) Placement Stats:", "Core Engineering (PG) Placement Statistics:");
        r.buttons = [
            {l:'Mechanical ⚙️',a:'plcmt_me_pg',i:'⚙️'},
            {l:'Civil 🏗️',a:'plcmt_cv_pg',i:'🏗️'},
            {l:'BioTech 🧬',a:'plcmt_bt_pg',i:'🧬'},
            {l:'Back',a:'plcmt_pg_categories',i:'🔙'}
        ];
        r.noMenu = true; break;
    case 'placements_future':
        r.text += T("Placement statistics for the 2027 batch (and beyond) are not yet available as the placement drives for these batches have not concluded. 📊", "Future Placement Statistics:");
        r.text += "\n• Currently, we have the ongoing 2026 placement data and the finalized 2025 data available.";
        r.buttons = [{l:'2026 Placements',a:'placements',i:'💼'}, {l:'Department-wise Stats',a:'dept_placements_list',i:'📊'}]; break;
    case 'placements':
        r.text += T("Our record is legendary! 📊 For the 2026 batch, the drive is ongoing with fantastic results!","Placement Statistics (2026 Batch - Ongoing):");
        r.text += "\n• Max: " + KB.placements.maxSalary + "\n• Avg: " + KB.placements.avgSalary + "\n• " + KB.placements.offers + "\n• " + KB.placements.companies + "\n• Top Recruiters: " + KB.placements.recruiters;
        r.text += T("\n\n🏆 Previous batch (2025): ₹67 LPA highest, 922 offers","\n\nPrevious Year (2025): ₹67 LPA highest package, 262 companies, 922 offers.");
        r.buttons = [{l:'Department-wise Stats',a:'dept_placements_list',i:'📊'}, {l:'Placement Training',u:KB.placements.url,i:'🌐'}]; break;
    case 'placement_director':
        r.text += T("👨‍💼 **Dean (Placement & Training):** Dr. D. Ranganath\n\n📌 **Role:** Heading the Department of Placement & Training at RVCE.", "👨‍💼 **Dean (Placement & Training):** Dr. D. Ranganath\n\nHeading the Placement & Training department at RVCE.");
        r.buttons = [{l:'Official Website 🌐',u:'https://rvce.edu.in/placement_and_training/',i:'🌐'},{l:'Placement Stats 💼',a:'placements',i:'💼'},{l:'Faculty & Deans 👨‍🏫',a:'deans_list',i:'👨‍🏫'}]; break;
    case 'top_companies':
        r.text += T("RVCE attracts the best in the industry! 🏢 Here are some of our top recruiters:","Top Recruiting Companies at RVCE:");
        r.text += "\n\n• " + KB.placements.recruiters.split(", ").join("\n• ");
        r.buttons = [{l:'Placements',a:'placements',i:'💼'},{l:'Admissions',a:'admissions',i:'🎓'}]; break;
    case 'refund_policy':
        r.text += T("Refund policy follows AICTE rules! 💸<br><br>• Before start: Full refund minus processing fee<br>• After start: Only if seat filled<br>• Document retention is BANNED.",
            "The Fee Refund Policy strictly follows <strong>AICTE Regulations</strong>.<br><br>• <strong>Before Course Start:</strong> Full refund minus a processing fee.<br>• <strong>After Course Start:</strong> Refundable only if the vacated seat is filled.<br>• <strong>Original Docs:</strong> By AICTE mandate, colleges cannot retain original certificates.");
        break;
    case 'syllabus_1st_sem':
        r.text += T("1st Year Syllabus (VTU 2022 Scheme) 📚<br><br>Physics & Chemistry cycles apply! Key subjects include Math, Electronics, C-Programming.",
            "The <strong>1st Year B.E. Syllabus</strong> follows the VTU 2022 Scheme.<br><br>Students are divided into Physics and Chemistry Cycles. Key subjects include:<br>• Engineering Mathematics<br>• Basic Electronics/Electrical<br>• Programming in C");
        r.buttons = [{l:'Download Syllabus PDF',u:'https://rvce.edu.in/sites/default/files/FIRST-YEAR-SYLLABUS-BOOK-2022-SCHEMEFORPRINT.pdf',i:'📑'}]; break;
    case 'faculty':
        r.text += T("Explore our department faculty! 👨‍🏫 Choose a category:", "Academic Faculty - Select a category:");
        r.buttons = [
            {l:'Computing & IT 💻',a:'fac_group_comp',i:'💻'},
            {l:'Electrical & Comm 🔌',a:'fac_group_elec',i:'🔌'},
            {l:'Core Engineering ⚙️',a:'fac_group_core',i:'⚙️'},
            {l:'Applied Sciences 🧬',a:'fac_group_sci',i:'🧬'},
            {l:'Deans List 📋',a:'deans_list',i:'👨‍🏫'},
            {l:'Main Menu',a:'menu',i:'🔙'}
        ];
        r.noMenu = true; break;
    case 'fac_group_comp':
        r.text += T("Computing & IT Faculty pages:", "Computing & IT Faculty pages:");
        r.buttons = [
            {l:'CSE 💻',u:'https://rvce.edu.in/department/cse/faculty/',i:'💻'},
            {l:'ISE 💻',u:'https://rvce.edu.in/department/ise/faculty/',i:'💻'},
            {l:'AIML 💻',u:'https://rvce.edu.in/department/ai_ml/faculty/',i:'💻'},
            {l:'Data Science 📊',u:'https://rvce.edu.in/department/cse/faculty/',i:'📊'},
            {l:'Cyber Security 🛡️',u:'https://rvce.edu.in/department/cse/faculty/',i:'🛡️'},
            {l:'MCA 💻',u:'https://rvce.edu.in/department/mca/main_department/',i:'💻'},
            {l:'All Faculty',a:'faculty',i:'🔙'}
        ];
        r.noMenu = true; break;
    case 'fac_group_elec':
        r.text += T("Electrical & Communication Faculty pages:", "Electrical & Communication Faculty pages:");
        r.buttons = [
            {l:'ECE 🔌',u:'https://rvce.edu.in/department/ece/faculty/',i:'🔌'},
            {l:'EEE ⚡',u:'https://rvce.edu.in/department/eee/faculty/',i:'⚡'},
            {l:'EIE 📡',u:'https://rvce.edu.in/department/eim/faculty/',i:'📡'},
            {l:'Telecom (ETE) 📱',u:'http://rvce.edu.in/department/etc/faculty/',i:'📱'},
            {l:'All Faculty',a:'faculty',i:'🔙'}
        ];
        r.noMenu = true; break;
    case 'fac_group_core':
        r.text += T("Core Engineering Faculty pages:", "Core Engineering Faculty pages:");
        r.buttons = [
            {l:'Mechanical ⚙️',u:'https://rvce.edu.in/department/me/faculty/',i:'⚙️'},
            {l:'Civil 🏗️',u:'https://rvce.edu.in/department/civil_engineering/faculty/',i:'🏗️'},
            {l:'Aerospace 🚀',u:'https://rvce.edu.in/department/ae/faculty/',i:'🚀'},
            {l:'Industrial (IEM) 🏭',u:'https://rvce.edu.in/department/iem/faculty/',i:'🏭'},
            {l:'All Faculty',a:'faculty',i:'🔙'}
        ];
        r.noMenu = true; break;
    case 'fac_group_sci':
        r.text += T("Applied Sciences Faculty pages:", "Applied Sciences Faculty pages:");
        r.buttons = [
            {l:'Biotechnology 🧬',u:'https://rvce.edu.in/department/biotechnology/faculty/',i:'🧬'},
            {l:'Chemical 🧪',u:'http://rvce.edu.in/department/chemical_engineering/faculty/',i:'🧪'},
            {l:'Chemistry 🧪',u:'https://rvce.edu.in/department/chemistry/faculty/',i:'🧪'},
            {l:'Mathematics 📐',u:'https://rvce.edu.in/department/maths/main_dept/',i:'📐'},
            {l:'Physics ⚛️',u:'https://rvce.edu.in/department/physics/faculty/',i:'⚛️'},
            {l:'All Faculty',a:'faculty',i:'🔙'}
        ];
        r.noMenu = true; break;
    case 'deans_list':
        r.text += T("Here are the top commanders at RVCE! ⚓\n\n","RVCE Deans & Key Executives:\n\n");
        r.text += "• **Principal:** Dr. K.N. Subramanya\n• **Vice Principal:** Dr. K. S. Geetha\n• **Dean Academics:** Dr. M.V. Renukadevi\n• **Dean Student Affairs:** Dr. B.M. Sagar\n• **Dean R&D:** Dr. M Uttara Kumari\n• **Dean CSE Cluster:** Dr. Ramakanth Kumar P\n• **Dean PG Circuit:** Dr. K Sreelakshmi\n• **Dean PG Non-Circuit:** Dr. Radhakrishna\n• **Dean Skill Dev:** Dr. M Krishna\n• **Dean Placement & Training:** Dr. D. Ranganath\n• **Dean Global Partnerships:** Dr. J R Nataraj";
        r.buttons = [{l:'Official Website 🌐',u:'https://rvce.edu.in/about_us/key-executives/',i:'🌐'}, {l:'HODs List 📚',a:'hods_list',i:'👩‍🏫'}]; break;
    case 'dean_academics':
        r.text += T("👩‍🏫 **Dean (Academics):** Dr. M.V. Renukadevi\n\n📌 **Role:** Heading Academic Regulations, Curriculum & Evaluation at RVCE.", "👩‍🏫 **Dean (Academics):** Dr. M.V. Renukadevi\n\nHeading Academic Affairs & Curriculum at RVCE.");
        r.buttons = [{l:'Official Website 🌐',u:'https://rvce.edu.in/about_us/key-executives/',i:'🌐'}, {l:'All Deans 🎓',a:'deans_list',i:'👨‍🏫'}, {l:'Principal 👨‍🏫',a:'principal',i:'👨‍🏫'}]; break;
    case 'dean_student_affairs':
        r.text += T("👨‍🏫 **Dean (Student Affairs):** Dr. B.M. Sagar\n\n📌 **Role:** Heading Student Activities, Welfare & Clubs at RVCE.", "👨‍🏫 **Dean (Student Affairs):** Dr. B.M. Sagar\n\nHeading Student Welfare & Campus Activities at RVCE.");
        r.buttons = [{l:'Official Website 🌐',u:'https://rvce.edu.in/about_us/key-executives/',i:'🌐'}, {l:'All Deans 🎓',a:'deans_list',i:'👨‍🏫'}, {l:'Cultural Life 🎭',a:'culturalLife',i:'🎭'}]; break;
    case 'dean_rnd':
        r.text += T("👩‍🔬 **Dean (Research & Development):** Dr. M Uttara Kumari\n\n📌 **Role:** Heading Research Projects, Patents & Grants at RVCE.", "👩‍🔬 **Dean (R&D):** Dr. M Uttara Kumari\n\nHeading Research & Innovation at RVCE.");
        r.buttons = [{l:'Official Website 🌐',u:'https://rvce.edu.in/research_consulting/',i:'🌐'}, {l:'Research & R&D 🔬',a:'research',i:'🔬'}, {l:'All Deans 🎓',a:'deans_list',i:'👨‍🏫'}]; break;
    case 'hods_list':
        r.text += T("Here are the Heads of Departments (HODs): 📚\n\n","RVCE Head of Departments:\n\n");
        r.text += "• **CSE:** Dr. Shanta Rangaswamy\n• **AIML:** To Be Appointed\n• **ISE:** Dr. Mamatha G S\n• **ECE:** Dr. Ravish Aradhya H V\n• **Mechanical:** Dr. Shanmukha Nagaraj\n• **Civil:** Dr. Anjaneyappa\n• **EEE:** Dr. J N Hemalatha (I/c)\n• **Aerospace:** [Dr. Supreeth R](https://rvce.edu.in/department/ae/dr_r_supreeth/)\n• **Biotech:** Dr. Nagashree N Rao\n• **Chemical:** Dr. Jagadish H Patil\n• **EIE:** Dr. CH. Renumadhavi\n• **ETE:** Dr. Nagamani K\n• **IEM:** Dr. Rajeswara Rao K V S\n• **MCA:** Dr. Jasmine K S\n• **Physics:** Dr. G. Shireesha\n• **Maths:** Dr. Jayalatha G\n• **Chemistry:** Dr. Mahesh R";
        r.buttons = [{l:'Deans List 🎓',a:'deans_list',i:'👨‍🏫'}, {l:'Key Executives Page',u:'https://rvce.edu.in/about_us/key-executives/',i:'🌐'}]; break;
    case 'dress_code':
        r.text += T("Dress sharp! 👔 No shorts or ripped jeans. Casuals are okay, but labs require safety gear (Khakis/Aprons)!",
            "As an institution affiliated with <strong>VTU</strong>, RVCE enforces a dress code that aligns with professional and academic decorum.<br><br>• <strong>General Wear:</strong> Clean, neat, and non-revealing casual wear is permitted.<br>• <strong>Prohibited:</strong> Shorts, ripped jeans, revealing tops.<br>• <strong>Labs/Workshops:</strong> Closed-toe shoes and safety uniforms mandatory.");
        break;
    case 'anti_ragging':
        r.text += T("Ragging is a crime! 🛑 Total ban at RVCE.<br><br>🚨 National Helpline: 1800-180-5522",
            "RVCE strictly adheres to the <strong>UGC Regulations on Curbing the Menace of Ragging (2009)</strong>. Ragging is a criminal offense.<br><br>🚨 <strong>National 24x7 Anti-Ragging Helpline:</strong> 1800-180-5522<br>Email: [helpline@antiragging.in](mailto:helpline@antiragging.in)");
        r.buttons = [{l:'Anti-Ragging Portal',u:'https://www.antiragging.in/',i:'🛑'}]; break;

    case 'culturalLife':
        r.text += T("Student life is more than classes! 🎭","Cultural Activities & Clubs:");
        r.text += "\n• Clubs: " + KB.campus.clubs.join(", ") + "\n• Fest: " + KB.campus.fest;
        r.buttons = [{l:'Cultural Teams',u:KB.campus.urls.cultural,i:'🌐'}]; break;

    case 'website':
        r.text += T("Here you go! 🌐","Official Website:");
        r.buttons = [{l:'rvce.edu.in',u:KB.contact.website,i:'🌐'}]; break;
    case 'intake':
        r.text += T("RVCE admits 2000+ students every year! 🎓","Annual intake: "+KB.general.intake+"."); break;
    case 'ug_disambiguation':
        r.text += T("Academic explorer! 🗺️ Are you looking to see the **Programmes List** or do you need **Admission Details** for UG?","Would you like to explore Undergraduate (B.E.) Programmes or check Admission Details?");
        r.buttons = [
            {l:'Programmes List 📜',a:'ugPrograms',i:'📋'},
            {l:'Admission Process 🎓',a:'ugAdm',i:'🎫'}
        ]; 
        return r;
    case 'ugPrograms':
        r.text += T("RVCE offers 16 Undergraduate (B.E.) programs. Choose a category:","RVCE offers 16 UG programs. Select a category below:");
        r.buttons = [
            {l:'Computing & IT 💻',a:'dept_group_comp',i:'💻'},
            {l:'Electrical & Comm 🔌',a:'dept_group_elec',i:'🔌'},
            {l:'Core Engineering ⚙️',a:'dept_group_core',i:'⚙️'},
            {l:'Applied Sciences 🧬',a:'dept_group_sci',i:'🧬'}
        ];
        r.noMenu = true; break;
    case 'pgPrograms':
        r.text += T("RVCE offers 14 Postgraduate programs. Choose a category to find your program:","RVCE offers 14 PG programs. Select a category below:");
        r.buttons = [
            {l:'Computing & IT 💻',a:'pg_group_comp',i:'💻'},
            {l:'Electrical & Comm 🔌',a:'pg_group_elec',i:'🔌'},
            {l:'Core Engineering ⚙️',a:'pg_group_core',i:'⚙️'},
            {l:'Applied Sciences 🧬',a:'pg_group_sci',i:'🧬'}
        ];
        r.noMenu = true; break;
    case 'pg_group_comp':
        r.text += T("M.Tech & MCA Computing Programs:","PG Computing Programs:");
        r.buttons = [{l:'M.Tech CSE',a:'pg_cs_cse',i:'💻'},{l:'M.Tech CNE',a:'pg_cs_cne',i:'💻'},{l:'M.Tech Software Engg',a:'pg_is_se',i:'💻'},{l:'M.Tech Info Tech',a:'pg_is_it',i:'💻'},{l:'MCA',a:'pg_mca',i:'💻'}];
        r.noMenu = true; break;
    case 'pg_group_elec':
        r.text += T("M.Tech Electrical & Communication:","PG Electrical & Communication:");
        r.buttons = [{l:'M.Tech VLSI',a:'pg_ec_vlsi',i:'🔌'},{l:'M.Tech Comm Sys',a:'pg_ec_cs',i:'📡'},{l:'M.Tech Digital Comm',a:'pg_et_dc',i:'📱'},{l:'M.Tech Power Electronics',a:'pg_ee_pe',i:'⚡'}];
        r.noMenu = true; break;
    case 'pg_group_core':
        r.text += T("M.Tech Core Engineering:","PG Core Engineering:");
        r.buttons = [{l:'M.Tech Structural',a:'pg_cv_se',i:'🏗️'},{l:'M.Tech Highway',a:'pg_cv_ht',i:'🛣️'},{l:'M.Tech Product Design',a:'pg_me_pd',i:'⚙️'},{l:'M.Tech Machine Design',a:'pg_me_md',i:'🏭'}];
        r.noMenu = true; break;
    case 'pg_group_sci':
        r.text += T("M.Tech Applied Sciences:","PG Applied Sciences:");
        r.buttons = [{l:'M.Tech Biotechnology',a:'pg_bt',i:'🧬'}];
        r.noMenu = true; break;
    case 'mca':
    case 'dept_mca':
        return renderDepartment(KB.departments.pg.find(d => d.c === 'mca'));
    case 'sports':
        r.text += T("Stay fit and active at RVCE! 🏃‍♂️🏆\n\nThe Department of Physical Education & Sports provides excellent facilities for indoor and outdoor games. RVCE students regularly participate in VTU, State, and National level tournaments.",
            "Department of Physical Education & Sports:\nRVCE provides comprehensive sports facilities and scholarships for outstanding athletes.");
        r.buttons = [
            {l:'Sports Dept Page',u:'https://rvce.edu.in/department-of-physical-education-sports/',i:'🌐'},
            {l:'Sports Scholarships',u:'https://rvce.edu.in/department-of-physical-education-sports/rvce-sports-scholarship/',i:'🏅'},
            {l:'VTU Tournaments',u:'https://rvce.edu.in/department-of-physical-education-sports/v-t-u-tournament-organized/',i:'🏆'}
        ];
        break;
    case 'phd':
        r.text += T("RVCE offers robust Ph.D. programs! 🧪 Check the official page for research domains.","Ph.D. Programs:");
        r.buttons = [{l:'Main Menu',a:'menu',i:'🏠'},{l:'Research at RVCE',u:'https://rvce.edu.in/research',i:'🔬'},{l:'PhD Admissions',u:'https://rvce.edu.in/admissions/#ph_link',i:'🌐'}]; break;
    case 'departments':
        r.text += T("Explore our departments! 📚 Choose a level of study:","Academic Departments - Select a level of study:");
        r.buttons = [
            {l:'UG Programs (B.E.) 🎓',a:'ugPrograms',i:'🎓'},
            {l:'PG Programs 📘',a:'pgPrograms',i:'📘'},
            {l:'Ph.D. Programs 🧪',a:'phd',i:'🧪'}
        ];
        r.noMenu = true;
        break;
    case 'career_options_menu':
        r.text += T("Select a department to view its Top Career Options! 🎯","Top Career Options - Select a Department:");
        r.buttons = [];
        KB.departments.ug.forEach(d => {
            if (KB.career_options[d.c]) {
                r.buttons.push({ l: d.n, a: 'career_' + d.c, i: '🎯' });
            }
        });
        KB.departments.pg.forEach(d => {
            if (KB.career_options[d.c]) {
                r.buttons.push({ l: d.n, a: 'career_' + d.c, i: '🎯' });
            }
        });
        r.buttons.push({l:'Main Menu',a:'menu',i:'🏠'});
        r.noMenu = true;
        break;
    case 'dept_group_comp':
        r.text += T("Computing & IT Branches:","Computing & IT:");
        r.buttons = [{l:'CSE',a:'dept_cs',i:'💻'},{l:'ISE',a:'dept_is',i:'💻'},{l:'AIML',a:'dept_aiml',i:'💻'},{l:'Data Science',a:'dept_csds',i:'📊'},{l:'Cyber Security',a:'dept_cscy',i:'🛡️'}];
        r.noMenu = true; break;
    case 'dept_group_elec':
        r.text += T("Electrical & Communication Branches:","Electrical & Communication:");
        r.buttons = [{l:'ECE',a:'dept_ec',i:'🔌'},{l:'EEE',a:'dept_ee',i:'⚡'},{l:'EIE',a:'dept_ei',i:'📡'},{l:'Telecom (ETE)',a:'dept_et',i:'📱'}];
        r.noMenu = true; break;
    case 'dept_group_core':
        r.text += T("Core Engineering & Manufacturing Branches:","Core Engineering:");
        r.buttons = [{l:'Mechanical',a:'dept_me',i:'⚙️'},{l:'Civil',a:'dept_cv',i:'🏗️'},{l:'Aerospace',a:'dept_ae',i:'🚀'},{l:'Industrial (IEM)',a:'dept_im',i:'🏭'}];
        r.noMenu = true; break;
    case 'dept_group_sci':
        r.text += T("Applied Sciences Branches:","Applied Sciences:");
        r.buttons = [{l:'Biotechnology',a:'dept_bt',i:'🧬'},{l:'Chemical',a:'dept_ch',i:'🧪'},{l:'Chemistry',a:'dept_chy',i:'🧪'},{l:'Mathematics',a:'dept_mat',i:'📐'},{l:'Physics',a:'dept_phy',i:'⚛️'}];
        r.noMenu = true; break;
    case 'campusLife':
        r.text += T("Life at RVCE is vibrant! 🏕️","Student Experience & Campus Life:");
        r.text += "\n• Cultural Clubs & Kannada Sangha\n• Technical Innovation Teams & STEAM\n• Sports & Athletics\n• NCC & NSS Units\n• Annual Fest: " + KB.campus.fest;
        r.buttons = [
            {l:'Cultural Clubs',a:'culturalLife',i:'🎭'},
            {l:'Innovation Teams',a:'innovationTeams',i:'💡'},
            {l:'Sports & Athletics',a:'sports',i:'🏆'},
            {l:'NCC & NSS',a:'ncc_nss_disambiguation',i:'🤝'}
        ]; break;
    case 'professional_societies':
        r.text += T("Get professional! 🤝 Join a chapter:","Professional Student Societies:");
        r.text += "\n• " + KB.campus.societies.join("\n• ") + "\n\nThese chapters host international conferences, workshops, and networking events regularly.";
        r.buttons = [{l:'Innovation Teams',a:'innovationTeams',i:'💡'},{l:'Cultural Clubs',a:'culturalLife',i:'🎭'}]; break;
    case 'hostels':
        r.text += T("Home away from home 🏠:","Hostel Facilities:");
        r.text += "\n• Boys: " + KB.hostels.boys + "\n• Girls: " + KB.hostels.girls + "\n• Amenities: " + KB.hostels.amenities;
        r.buttons = [{l:'Hostel Facilities Page 🌐',u:'https://rvce.edu.in/facilities/hostel/',i:'🌐'}]; break;
    case 'stats_disambiguation':
        r.text += T("Check out the numbers! 📊","RVCE Statistics:");
        r.buttons = [{l:'Placement Stats',a:'placements',i:'💼'},{l:'NIRF & Rankings',a:'ranking',i:'🏆'},{l:'Upcoming Events 📅',a:'upcoming_events',i:'🔥'}]; break;
    case 'upcoming_events':
        r.text += T("What's brewing at RVCE? 📅","Upcoming Events Calendar 2026:");
        KB.events.forEach(e => {
            r.text += `\n• **${e.name}** — ${e.date} (${e.type})`;
        });
        r.buttons = [{l:'Placement Scene',a:'placements',i:'💼'},{l:'Main Menu',a:'menu',i:'📋'}]; break;
    case 'facilities':
        r.text += T("Top-notch facilities 🏢:","Campus Infrastructure:");
        r.text += "\n• " + KB.facilities.list.join("\n• ");
        r.buttons = [{l:'Full Details',u:KB.facilities.url,i:'🌐'}]; break;
    case 'vtu':
        r.text += T("VTU affiliated but autonomous for UG! 🏛️","RVCE is affiliated to VTU (Visvesvaraya Technological University) and has Autonomous status for UG programs."); break;
    case 'transport':
        r.text += T("Getting to RVCE 🚌:\n• Located on Mysuru Road, ~13 km from city center\n• BMTC buses: Multiple routes to RVCE stop\n• Nearest Metro: Kengeri station\n• Autos & cabs: Easily available\n• Near NICE Road junction",
            "How to Reach RVCE:\n• Location: Mysuru Road, ~13 km from Bengaluru city center\n• Bus: BMTC bus routes serve the RVCE stop directly\n• Metro: Kengeri Metro station is the nearest\n• Auto/Cab: Easily accessible via Mysuru Road\n• Near NICE Road junction"); break;
    case 'wifi':
        r.text += T("Yes! Wi-Fi everywhere! 📶 Campus + Hostels!","Wi-Fi is available across the campus and in hostel blocks."); break;
    case 'food':
        r.text += T("Hungry? 🍛 RVCE has multiple food spots! The food served is highly nutritious, tasty, and strictly vegetarian. **"+KB.general.foodCourt.name+"** is the biggest! 😋",
            "### 🍽️ Dining at RVCE\n\n" +
            "The food served is highly nutritious, tasty, and strictly vegetarian.\n\n" +
            "**1. Campus Food Courts:**\n" +
            "• **Main Food Court (Cafe Mingos):** " + KB.general.foodCourt.features + ".\n" +
            "• **Mini Canteen & Extension:** Located near departments for quick snacks and easier access.\n" +
            "• **Timings:** " + KB.general.foodCourt.timings + "\n\n" +
            "**2. Hostel Messes (Strictly Veg):**\n" +
            "• " + KB.hostelDetails.messDetails.messes.join(", ") + "\n" +
            "• Serves: " + KB.hostelDetails.messDetails.meals + ".");
        r.buttons = [{l:'Campus Facilities',a:'facilities',i:'🏢'}, {l:'Mess Details',a:'mess',i:'🍲'}]; break;
    case 'mess':
        r.text += T("The hostel mess serves strictly vegetarian food that is nutritious and tasty to keep you fueled! 🍲\n\nWe have messes across different hostels like: " + KB.hostelDetails.messDetails.messes.join(", ") + ".",
            "### 🏠 Hostel Mess Information\n\n" +
            "• **Food Quality:** The food served is highly nutritious, tasty, and strictly vegetarian.\n" +
            "• **Messes:** " + KB.hostelDetails.messDetails.messes.join(", ") + "\n" +
            "• **Cuisine:** " + KB.hostelDetails.messDetails.type + "\n" +
            "• **Meals:** " + KB.hostelDetails.messDetails.meals + "\n" +
            "• **Management:** " + KB.hostelDetails.messDetails.management + "\n\n" +
            "**Looking for more?** The campus also has a multi-level **Food Court (Cafe Mingos)** open from 9 AM to 4:30 PM.");
        r.buttons = [{l:'Hostel Details',a:'hostels',i:'🏠'}, {l:'Food Court',a:'food',i:'🍛'}]; break;
    case 'exam':
        r.text += T("Exams? 📝 Semester system with CIE + SEE. Being autonomous, RVCE sets its own papers!","RVCE follows a semester system with Continuous Internal Evaluation (CIE) and Semester End Examination (SEE). As an autonomous institution, it designs its own syllabus and sets examination papers."); break;
    case 'nri':
        r.text += T("International students welcome! 🌍 CIWG/PIO/OCI/Nepal quotas available!","International admissions: Quotas available for CIWG, PIO, OCI, and Nepal Citizens.");
        r.buttons = [{l:'Admissions',u:KB.admissions.url,i:'🌐'}]; break;
    case 'library':
        r.text += T("The Central Library is a knowledge fortress! 📚","Central Library:");
        r.text += "\n• 1,00,000+ books, journals, and e-resources\n• Digital library with IEEE, Springer, Elsevier, NPTEL access\n• Reading rooms and group study areas\n• Reprography, book bank, and reference section\n• Open during college hours (Mon-Sat)";
        r.buttons = [{l:'Library Portal',u:'https://rvce.edu.in/library/',i:'🌐'}]; break;
    case 'ncc_nss_disambiguation':
        r.text += T("Service and Leadership! 🇮🇳 Choose a unit:","NCC & NSS Units:");
        r.buttons = [{l:'NCC 🇮🇳',a:'ncc',i:'🎖️'},{l:'NSS 🤝',a:'nss',i:'🌍'}]; break;
    case 'ncc':
        r.text += T("Join the National Cadet Corps (NCC) at RVCE! 🇮🇳","National Cadet Corps (NCC):");
        r.text += "\n• " + KB.ncc.battalion + " (Est. " + KB.ncc.established + ")\n• Strength: " + KB.ncc.strength + "\n• Activities: " + KB.ncc.activities;
        r.buttons = [{l:'NCC Page',u:'https://rvce.edu.in/ncc/',i:'🌐'}]; break;
    case 'nss':
        r.text += T("Service before self! 🤝 Join the NSS at RVCE.","National Service Scheme (NSS):");
        r.text += "\n• " + KB.nss.units + " with " + KB.nss.strength + "\n• Motto: " + KB.nss.motto + "\n• Activities: " + KB.nss.activities;
        r.buttons = [{l:'NSS Page',u:'https://rvce.edu.in/national_service_scheme_nss/',i:'🌐'}]; break;
    case 'kannada_sangha':
        r.text += T("Promoting the heritage of Karnataka! 🎭","Kannada Sangha:");
        r.text += "\n• " + KB.kannadaSangha.info + "\n• Events: " + KB.kannadaSangha.events;
        r.buttons = [{l:'Kannada Sangha',u:'https://rvce.edu.in/cultural_teams/kannada_sangha/',i:'🎭'}]; break;
    case 'rvjsteam':
        r.text += T("Science, Technology, Engineering, Arts, and Mathematics! 🎨","RVJ STEAM Team:");
        r.text += "\n• " + KB.rvjsteam.info;
        r.buttons = [{l:'STEAM Team Page',u:'https://rvce.edu.in/rvjsteam/',i:'🌐'}]; break;
    case 'mandatory_disclosure':
        r.text += T("Official compliance and disclosures. 📄","Mandatory Disclosure:");
        r.buttons = [{l:'View Disclosure',u:'https://rvce.edu.in/mandatory-disclosure/',i:'📄'}]; break;
    case 'calendar_events':
        r.text += T("Upcoming Events & NEWS! 📅\n\nGet ready for what's next! Our Upcoming Events section is constantly updated with exciting technical talks, cultural fests, and campus activities designed to challenge, connect and inspire. Don't miss a beat!",
            "### 📅 Upcoming Events & NEWS\n\nGet ready for what's next—our Upcoming Events section is constantly updated with exciting technical talks, cultural fests, and campus activities designed to challenge, connect, and inspire. Don't miss a beat!\n\nCheck the official RVCE Events page for the latest updates.");
        r.buttons = [{l:'Events Page 📅',u:'https://rvce.edu.in/events/',i:'📅'},{l:'Academic Calendar',u:'https://rvce.edu.in/calendar-of-events/',i:'🗓️'}]; break;
    case 'sports_simple':
        r.text += T("Sporty campus! 🏅","Sports Facilities:");
        r.text += "\n• 400m athletic track\n• Cricket & Football grounds\n• Basketball, Volleyball, Badminton courts\n• Gymnatorium with modern equipment\n• Table Tennis, Chess";
        r.buttons = [{l:'Sports Info',u:'https://rvce.edu.in/facilities/sports_and_gymnatorium/',i:'🌐'}]; break;
    case 'numbers_info':
        r.text += T("Looking for specific numbers? 📞 Here are the most requested ones:","Please select the type of numerical information or contact you are looking for:");
        r.buttons = [
            {l:'Placement Stats 💼',a:'placements',i:'📈'},
            {l:'Official Contact 📞',a:'contact',i:'📱'},
            {l:'Admission Desk 🎓',a:'admissions',i:'🎫'},
            {l:'Hostel Help 🏠',a:'hostels',i:'🛌'}
        ]; break;
    case 'intake':
        r.text += T("RVCE has a significant intake capacity! 🎓 Every year, we admit over **2,000+ students** across our 16 UG and 14 PG programs. Seats are filled through KCET, COMEDK, and Management Quota.", "RVCE has an annual intake of over 2,000 students across its various Undergraduate and Postgraduate programs.");
        r.buttons = [{l:'Admission Info',a:'admissions',i:'🎫'}, {l:'UG Programs',a:'ugPrograms',i:'📜'}]; break;
    case 'student_count':
        r.text += T("RVCE is a bustling hub of talent! 👨‍🎓👩‍🎓 We have approximately **8,000 to 9,000 students** on campus at any given time, including all years of UG and PG programs.", "The total student population at RVCE is approximately 8,000 to 9,000, encompassing students across all years of undergraduate and postgraduate courses.");
        r.buttons = [{l:'Campus Life',a:'campusLife',i:'🏕️'}, {l:'Innovation Teams',a:'innovationTeams',i:'💡'}]; break;
    case 'autonomous':
        r.text += T("RVCE is autonomous for UG — they design their own syllabus and exams! 📋 For PG, it's affiliated to VTU.","RVCE has Autonomous status for UG programs, meaning it designs its own curriculum and conducts its own examinations. PG programs are affiliated to VTU."); break;
    // ===== PARENT & GEN-Z SPECIFIC RESPONSES =====
    case 'safety':
        r.text += T("Your safety is top priority at RVCE! 🛡️","Campus Safety at RVCE:");
        r.text += "\n• " + KB.safety.cctv + "\n• " + KB.safety.wardens + "\n• " + KB.safety.healthCentre + "\n• " + KB.safety.grievance + "\n• " + KB.safety.antiRagging;
        r.buttons = [{l:'Health Centre Details 🏥',a:'health_centre',i:'🩺'},{l:'Anti-Ragging',a:'anti_ragging',i:'🛑'}]; break;
    case 'health_centre':
        r.text += T("Health is wealth! 🏥 The on-campus centre is solid:","Health Centre Facilities:");
        r.text += "\n• " + KB.safety.healthDetails.doctor + "\n• Services: " + KB.safety.healthDetails.services.join(", ") + "\n• Partnership: " + KB.safety.healthDetails.hospital + "\n• 24/7 Ambulance available for emergencies.";
        r.buttons = [{l:'Safety Info',a:'safety',i:'🛡️'}]; break;
    case 'attendance':
        r.text += T("Attendance matters at RVCE! 📋 It's strict but keeps you on track!","Attendance Policy:");
        r.text += "\n• " + KB.attendance.requirement + "\n• " + KB.attendance.consequence + "\n• " + KB.attendance.tracking;
        break;
    case 'roi':
        r.text += T("Is RVCE paisa vasool? ABSOLUTELY! 💎\n\n","Return on Investment:\n\n");
        r.text += "• 2026 Highest Package: " + KB.placements2026.maxSalary + "\n• Avg Package: " + KB.placements2026.avgSalary + "\n• Offers so far: " + KB.placements2026.offers + "\n• " + KB.placements2026.companies + "\n• Top recruiters: Microsoft, Google, Amazon, Samsung\n• NAAC A+ accreditation";
        r.buttons = [{l:'Placements',a:'placements',i:'💼'},{l:'Fee Structure',a:'fees',i:'💰'}]; break;
    case 'girls_hostel':
        r.text += T("Girls Hostel Facilities & Details 👧\n\n📌 **On-Campus Block:** Diamond Jubilee (DJ) Block (Deputy Warden: Dr. Sudha Kamath M K)\n📌 **Off-Campus Block:** Krishna Garden Block (Pattanagere)\n✨ **Amenities:** 24/7 Security & CCTV, Wi-Fi, Laundry, Solar Hot Water, Reading Room & Strictly Veg Mess\n⏰ **Curfew:** Strict curfew timings for safety",
            "### 👧 Girls Hostel Facilities & Information\n\n• **On-Campus Block:** Diamond Jubilee (DJ) Block (Deputy Warden: Dr. Sudha Kamath M K)\n• **Off-Campus Block:** Krishna Garden Block (Pattanagere)\n• **Amenities:** 24/7 Security & CCTV, Wi-Fi, Laundry, Solar Hot Water, Reading Room & Strictly Veg Mess\n• **Safety:** Residential Wardens & Strict Curfew Timings");
        r.buttons = [
            {l:'Girls Hostel Page 🌐', u:'https://rvce.edu.in/facilities/hostel/', i:'🌐'},
            {l:'Boys Hostel 👦', a:'boys_hostel', i:'👦'},
            {l:'Mess Info 🍽️', a:'mess', i:'🍽️'},
            {l:'Safety Info 🛡️', a:'safety', i:'🛡️'}
        ]; break;
    case 'boys_hostel':
        r.text += T("Boys Hostel Facilities & Details 👦\n\n📌 **Blocks:** Chamundi, Cauvery, Sir MV, Krishna Blocks\n✨ **Amenities:** 24/7 Security & CCTV, Wi-Fi, Laundry, Solar Hot Water, Reading Rooms, Sports Gym & Strictly Veg Mess",
            "### 👦 Boys Hostel Facilities & Information\n\n• **Hostel Blocks:** Chamundi, Cauvery, Sir MV, Krishna Blocks\n• **Amenities:** 24/7 Security & CCTV, Wi-Fi, Laundry, Solar Hot Water, Reading Rooms, Sports Gym & Strictly Veg Mess");
        r.buttons = [
            {l:'Boys Hostel Page 🌐', u:'https://rvce.edu.in/facilities/hostel/', i:'🌐'},
            {l:'Girls Hostel 👧', a:'girls_hostel', i:'👧'},
            {l:'Mess Info 🍽️', a:'mess', i:'🍽️'},
            {l:'Main Menu 📋', a:'menu', i:'📋'}
        ]; break;
    case 'environment_sustainability':
        r.text += T("Environment & Sustainability at RVCE 🌿\n\nA serene, eco-friendly campus built with sustainability at its core. Our infrastructure features advanced systems including solar power, rainwater harvesting and wastewater recycling.",
            "### 🌿 Environment & Sustainability at RVCE\n\nA serene, eco-friendly campus built with sustainability at its core. Our infrastructure features advanced systems designed to minimise environmental impact while maximising efficiency.\n\nExplore the key features that make our campus a model of modern, sustainable education, including:\n• **Solar Power**\n• **Rainwater Harvesting**\n• **Wastewater Recycling (Sewage Treatment)**");
        r.buttons = [
            {l:'Environment & Sustainability Page 🌐', u:'https://rvce.edu.in/facilities/environment_and_sustainability/', i:'🌐'},
            {l:'Campus Infrastructure 🏢', a:'facilities', i:'🏢'},
            {l:'Main Menu 📋', a:'menu', i:'📋'}
        ]; break;
    case 'iqac':
        r.text += T("IQAC (Internal Quality Assurance Cell) Reports & Guidelines! 📋\n\nThe IQAC portal provides access to structural details, AQAR reports, policies, and various audit reports of RVCE.",
            "### 📋 Internal Quality Assurance Cell (IQAC)\n\nThe IQAC portal contains official reports and policies for RVCE, including:");
        r.text += "\n\n• **Structure:** Structure of Internal Quality Assurance Cell (IQAC)\n• **Reports:** AQAR Reports\n• **Guidelines:** Policy and Guidelines\n• **Audits & Feedback:** Student Feedback Reports, Academic Audit Reports, and Examination Audit Reports";
        r.buttons = [
            {l:'Official IQAC Page 🌐', u:'https://rvce.edu.in/about_us/internal_quality_assurance_cell_iqac/', i:'🌐'},
            {l:'Accreditation 💎', a:'accreditation', i:'💎'},
            {l:'Main Menu 📋', a:'menu', i:'📋'}
        ]; break;
    case 'nearby':
        r.text += T("What's around RVCE? Plenty! 📍","Nearby Areas & Amenities:");
        r.text += "\n• Areas: " + KB.nearby.areas + "\n• Food: " + KB.nearby.food + "\n• Shopping: " + KB.nearby.shopping + "\n• Hospitals: " + KB.nearby.hospitals + "\n• Connectivity: " + KB.nearby.connectivity;
        r.buttons = [{l:'Transport',a:'transport',i:'🚌'},{l:'Food Court',a:'food',i:'🍛'}]; break;
    case 'internship':
        r.text += T("Internships? RVCE students are everywhere! 🧑‍💻","Internship Opportunities:");
        r.text += "\n• Mandatory 6-8 week industry internship in curriculum\n• Placement & Training cell assists with internship placements\n• Top companies like Google, Microsoft, Amazon, Bosch offer internships\n• Being in Bangalore (India's tech capital) = tons of opportunities\n• Many students do internships at IITs, IISc, DRDO, ISRO";
        r.buttons = [{l:'Placements',a:'placements',i:'💼'},{l:'Innovation Teams',u:'https://rvce.edu.in/innovative_teams/',i:'🚀'}]; break;
    case 'innovationTeams':
        r.text += T("RVCE's Innovation Teams are LEGENDARY! 🚀 They build everything from race cars to satellites!","Innovative & Project Teams at RVCE:");
        r.text += "\n\n• **Team Ashwa**: Formula Student racing 🏎️\n• **Team Antariksh**: Space Tech 🛰️\n• **Team Vyoma**: UAVs & Drones 🛸\n• **Team Chimera**: Hybrid Racing ⚡\n• **ASTRA Robotics**: AI & Robotics 🤖\n• **Project Garuda**: Super Mileage 🔋\n• **Team Chitrak**: Electric Motorcycles 🏍️\n• **Anoraniya**: Quantum Tech ⚛️";
        r.buttons = [
            {l:'Team Ashwa',a:'team_ashwa',i:'🏎️'}, 
            {l:'Team Antariksh',a:'team_antariksh',i:'🛰️'},
            {l:'Team Vyoma',a:'team_vyoma',i:'🛸'},
            {l:'Team Chimera',a:'team_chimera',i:'⚡'},
            {l:'ASTRA Robotics',a:'astra_robotics',i:'🤖'},
            {l:'All Teams List',u:'https://rvce.edu.in/innovative_teams/',i:'🚀'}
        ]; break;

    case 'team_ashwa':
    case 'ashwa':
        r.text += T("Team Ashwa is the pride of RVCE! 🏎️💨\n\nThey design and build high-performance Formula Student cars. Established in 2003, they were India's first FS team to compete globally. They recently achieved a top-10 worldwide ranking in hybrid technology!","Team Ashwa (Formula Student):\n\nTeam Ashwa is RVCE’s premier Formula Student team. Achievements include top-10 global rankings and consistent performance in FS Germany and FS Italy.");
        r.buttons = [{ l: 'Visit Team Ashwa', u: 'https://rvce.edu.in/innovative_teams/ashwa/', i: '🏎️' }, { l: 'All Teams', u: 'https://rvce.edu.in/innovative_teams/', i: '🚀' }]; break;
    case 'team_antariksh':
    case 'antariksh':
        r.text += T("Team Antariksh is reaching for the stars! 🛰️✨\n\nIn December 2024, they successfully launched **RVSat-1** aboard ISRO's PSLV C-60! It carried India's first student-developed microbiological payload. They also launched the **Ananta** rocket to 1km apogee!","Team Antariksh (Space Technology):\n\nTeam Antariksh focuses on aerospace and space tech. Their recent highlights include the RVSat-1 satellite launch with ISRO and the Ananta rocket launch in 2024.");
        r.buttons = [{ l: 'Visit Team Antariksh', u: 'https://rvce.edu.in/innovative_teams/antariksh/', i: '🚀' }, { l: 'All Teams', u: 'https://rvce.edu.in/innovative_teams/', i: '🚀' }]; break;
    case 'team_vyoma':
    case 'vyoma':
        r.text += T("Team Vyoma is the king of the skies! 🛸🦅\n\nThey are RVCE's premier Aero-design and UAV team. In 2024, they were named the **'Best Overall Performer'**! They design autonomous drones, heavy-lift UAVs, and innovative aircraft for global competitions like SAE Aero Design.","Team Vyoma (Aero-design):\n\nTeam Vyoma is the aerospace and UAV project team. They achieved the 'Best Overall Performer' award in 2024 for their drone technology and SAE competition success.");
        r.buttons = [{ l: 'Visit Team Vyoma', u: 'https://rvce.edu.in/innovative_teams/vyoma/', i: '🛸' }, { l: 'All Teams', u: 'https://rvce.edu.in/innovative_teams/', i: '🚀' }]; break;
    case 'team_chimera':
    case 'chimera':
        r.text += T("Team Chimera is electrifying the track! ⚡🏎️\n\nThey design and build hybrid and electric race cars. They recently secured **4th place overall** at the FSEV Challenge! Their focus is on battery management, powertrain optimization, and sustainable racing tech.","Team Chimera (Hybrid/Electric Racing):\n\nTeam Chimera focuses on sustainable automotive technology. Recent highlights include a 4th place finish at the FSEV Challenge.");
        r.buttons = [{ l: 'Visit Team Chimera', u: 'https://rvce.edu.in/innovative_teams/chimera/', i: '⚡' }, { l: 'All Teams', u: 'https://rvce.edu.in/innovative_teams/', i: '🚀' }]; break;
    case 'astra_robotics':
    case 'astra':
        r.text += T("ASTRA Robotics is the future of AI! 🤖🦾\n\nThey specialize in robotics and autonomous systems. Their **Project T.A.R.A** (autonomous surveillance) was recently presented to the Chief of the Indian Army! They compete in international robotics challenges and build cutting-edge automation solutions.","ASTRA Robotics:\n\nASTRA Robotics specializes in AI and autonomous systems. Notable projects include Project T.A.R.A, which was presented to high-level military officials.");
        r.buttons = [{ l: 'Visit ASTRA Robotics', u: 'https://rvce.edu.in/innovative_teams/astra/', i: '🤖' }, { l: 'All Teams', u: 'https://rvce.edu.in/innovative_teams/', i: '🚀' }]; break;
    case 'team_chitrak':
    case 'chitrak':
        r.text += T("Team Chitrak is building the future of two-wheelers! 🏍️⚡\n\nThey are RVCE's electric motorcycle team. They won the **'Lightest Motorcycle'** award for their innovative chassis design. They focus on urban mobility and high-efficiency electric powertrains.","Team Chitrak (Electric Motorcycles):\n\nTeam Chitrak designs lightweight electric motorcycles for urban performance. Award winners for innovative engineering.");
        r.buttons = [{ l: 'Visit Team Chitrak', u: 'https://rvce.edu.in/innovative_teams/chitrak/', i: '🏍️' }, { l: 'All Teams', u: 'https://rvce.edu.in/innovative_teams/', i: '🚀' }]; break;
    case 'anoraniya':
        r.text += T("Anoraniya is diving into the Quantum realm! ⚛️🔬\n\nThis team focuses on Quantum Technology and Communication. They successfully implemented the **BB84 Quantum Key Distribution protocol**! They are one of the few student teams in India working on cutting-edge quantum research.","Anoraniya (Quantum Tech):\n\nAnoraniya focuses on quantum communication and research. They have successfully implemented advanced quantum protocols.");
        r.buttons = [{ l: 'Visit Anoraniya', u: 'https://rvce.edu.in/innovative_teams/anoraniya/', i: '⚛️' }, { l: 'All Teams', u: 'https://rvce.edu.in/innovative_teams/', i: '🚀' }]; break;
    case 'project_garuda':
    case 'garuda':
        r.text += T("Project Garuda is all about ultra-efficiency! 🔋🍃\n\nThey build super-mileage electric vehicles designed to travel hundreds of kilometers on a single charge. They compete in the Shell Eco-marathon and push the boundaries of aerodynamics and energy efficiency.","Project Garuda (Super Mileage EVs):\n\nProject Garuda focuses on high-efficiency electric vehicles and competes in global eco-marathons.");
        r.buttons = [{ l: 'Visit Project Garuda', u: 'https://rvce.edu.in/innovative_teams/garuda/', i: '🔋' }, { l: 'All Teams', u: 'https://rvce.edu.in/innovative_teams/', i: '🚀' }]; break;
    case 'culturalTeams':
        r.text += T("Campus is always buzzing! 💃🎶 From dance to photography, we've got it all!", "Cultural Teams & Clubs at RVCE:");
        r.text += "\n\n• **RAAG**: Music 🎵\n• **Footprints**: Dance 💃\n• **F/6.3**: Photography 📸\n• **Evoke**: Fashion 👗\n• **DebSoc**: Debating 🗣️\n• **QuizCorp**: Trivia 🧠\n• **Rotaract**: Social Service 🤝\n• **E-Cell**: Entrepreneurship 💡";
        r.buttons = [
            { l: 'Footprints', u: 'https://rvce.edu.in/cultural_teams/footprints/', i: '💃' },
            { l: 'RAAG', u: 'https://rvce.edu.in/cultural_teams/raag/', i: '🎵' },
            { l: 'F/6.3 Photo', u: 'https://rvce.edu.in/cultural_teams/f-6-3-photography-club/', i: '📸' },
            { l: 'Evoke', u: 'https://rvce.edu.in/cultural_teams/evoke/', i: '👗' },
            { l: 'More Clubs', a: '_more_cultural_teams', i: '➕' }
        ]; break;
    case '_more_cultural_teams':
        r.text += "Check out these other amazing clubs and societies at RVCE:";
        r.buttons = [
            { l: 'DebSoc', u: 'https://rvce.edu.in/cultural_teams/debsoc/', i: '🗣️' },
            { l: 'QuizCorp', u: 'https://rvce.edu.in/cultural_teams/quizcorp/', i: '🧠' },
            { l: 'Rotaract', u: 'https://rvce.edu.in/cultural_teams/rotaract-club/', i: '🤝' },
            { l: 'E-Cell', u: 'https://rvce.edu.in/cultural_teams/entrepreneurship-cell/', i: '💡' },
            { l: 'All Cultural', a: 'culturalTeams', i: '🎭' }
        ]; break;
    case 'startup':
        r.text += T("Startup vibes are real at RVCE! 🚀","Entrepreneurship & Startup Ecosystem:");
        r.text += "\n• Active E-Cell (Entrepreneurship Cell) organizes events & workshops\n• Innovation & Incubation Centre for student startups\n• Annual hackathons and startup pitch competitions\n• Bangalore = India's startup capital — perfect ecosystem\n• Many RVCE alumni have founded successful startups";
        r.buttons = [{l:'Innovation Teams',a:'innovationTeams',i:'💡'},{l:'Campus Life',a:'campusLife',i:'🏕️'}]; break;
    case 'peer_quality':
        r.text += T("The crowd at RVCE is top-tier! 🎯 Competitive AF but also super helpful!","Peer Quality at RVCE:");
        r.text += "\n• Highly competitive admission (KCET/COMEDK) ensures quality intake\n• 2000+ students admitted annually from top rank holders\n• Strong coding culture — students participate in ICPC, GSoC, hackathons\n• Active on competitive platforms (Codeforces, LeetCode, CodeChef)\n• Collaborative environment with study groups and project teams";
        r.buttons = [{l:'Placements',a:'placements',i:'💼'},{l:'Rankings',a:'ranking',i:'🏆'}]; break;
    case 'worth_it':
        r.text += T("Is RVCE worth it? Let me put it this way — it SLAPS! 🔥\n\n","Is RVCE Worth Joining?\n\n");
        r.text += "✅ NAAC A+ | NIRF 101-150 | #1 Private (IIRF)\n✅ 2025: ₹67 LPA highest, 260+ companies\n✅ 2024: ₹92 LPA highest, 75% placement rate\n✅ Autonomous (own syllabus, industry-relevant)\n✅ Bangalore location = internship & job hub\n✅ 100+ patents, 20 Centres of Excellence\n✅ Strong alumni network in top MNCs";
        r.buttons = [{l:'Placements',a:'placements',i:'💼'},{l:'Rankings',a:'ranking',i:'🏆'},{l:'ROI',a:'roi',i:'💎'}]; break;
    case 'best_branch':
        r.text += T("Which branch is the GOAT? 🔝 Here's the lowdown:","Branch Selection Guide:");
        r.text += "\n\n🔥 **Highest Demand (Top Packages):** CSE, ISE, AIML, CSDS, CSCY\n💻 **Strong Tech:** ECE, ETE (with good coding skills)\n⚙️ **Core Engineering:** Mech, Civil, EEE, Chemical, Aero (strong in core companies like Bosch, ABB, Boeing)\n🧬 **Niche:** Biotech, IEM\n\n💡 Tip: Branch matters less than what YOU do — coding skills, projects, and internships make the real difference!";
        r.buttons = [{l:'All Departments',a:'departments',i:'📚'},{l:'Placements',a:'placements',i:'💼'}]; break;
    case 'parking':
        r.text += T("Got a ride? 🅿️ RVCE has parking!","Vehicle & Parking Info:");
        r.text += "\n• Dedicated two-wheeler and four-wheeler parking areas\n• Bikes and scooties are commonly used by students\n• Parking is free for students with valid college ID\n• Helmets mandatory as per campus rules";
        break;
    case 'part_time':
        r.text += T("Side hustle while studying? Smart move! 💼","Part-Time Work Opportunities:");
        r.text += "\n• Bangalore has tons of freelancing and part-time opportunities\n• Many students freelance in web dev, graphic design, tutoring\n• Coding contests and hackathons often have cash prizes\n• Some students do remote internships alongside studies\n• Note: Academic workload at RVCE is heavy — balance wisely!";
        r.buttons = [{l:'Internships',a:'internship',i:'🧑‍💻'},{l:'Startup Culture',a:'startup',i:'🚀'}]; break;
    case 'alumni':
        r.text += T("RVCE alumni are EVERYWHERE — from Google to ISRO! 🤝","Alumni Network:");
        r.text += "\n• 60+ years of alumni across the globe (Est. 1963)\n• Strong presence in top tech companies (Google, Microsoft, Amazon, Flipkart)\n• Active alumni chapters in Bangalore, Mumbai, USA, Europe\n• Alumni mentorship programs for current students\n• Regular alumni meets and networking events\n• Many alumni are founders of successful startups";
        r.buttons = [{l:'Alumni Portal',u:'https://rvce.edu.in/alumni-2/',i:'🎓'}, {l:'Placements',a:'placements',i:'💼'},{l:'About RVCE',a:'about_disambiguation',i:'🏫'}]; break;
    case 'college_compare':
        r.text += T("RVCE vs others? Here's the tea ☕:","RVCE in Comparison:");
        r.text += "\n\n📊 **RVCE Strengths:**\n• #1 Private Engg College (IIRF 2025)\n• NAAC A+ (higher than most private colleges)\n• Autonomous status — industry-relevant curriculum\n• ₹67 LPA highest (2025), ₹92 LPA (2024)\n• 260+ companies visit campus\n\n🏛️ RVCE is consistently ranked alongside PES, MSRIT, and BMS as Bangalore's top private engineering colleges. It edges ahead in autonomy, research output, and industry connections.";
        r.buttons = [{l:'Rankings',a:'ranking',i:'🏆'},{l:'Placements',a:'placements',i:'💼'},{l:'Is It Worth It?',a:'worth_it',i:'⭐'}]; break;
    case 'menu':
        r.text = T("How can I help? Choose a topic:","Main Menu — Choose a topic:");
        r.noMenu = true; return r;
    default:
        // Handle department-specific HOD requests
        if (id && id.startsWith('hod_')) {
            const c = id.replace('hod_','');
            const d = KB.departments.ug.find(x=>x.c===c) || KB.departments.pg.find(x=>x.c===c);
            if (d && d.hod) {
                if (d.hod_bio) return renderHODCard(d);
                r.text += T(`The Head of Department for ${d.n} is **${d.hod}**! 👨‍🏫`, `The HOD for **${d.n}** is **${d.hod}**.`);
                r.buttons = [{l:'Department Page',u:d.u,i:'🌐'}, {l:'All HODs',a:'hods_list',i:'👩‍🏫'}];
                return r;
            } else {
                r.text += T(`I don't have the specific HOD name for ${d?d.n:c} saved. Let me show you the full list! 📚`, "Please check the full HODs list for that information.");
                r.buttons = [{l:'HODs List',a:'hods_list',i:'👩‍🏫'}, {l:'Key Executives',u:'https://rvce.edu.in/about_us/key-executives/',i:'🌐'}];
                return r;
            }
        }
        // Handle department links (UG and PG)
        if (id && (id.startsWith('dept_') || id.startsWith('pg_'))) {
            const c = id.replace('dept_','').replace('pg_','');
            const d = KB.departments.ug.find(x=>x.c===c) || KB.departments.pg.find(x=>x.c===c);
            if (d) return renderDepartment(d);
        }
        // Handle 'More Options' for departments
        if (id && id.startsWith('more_dept_')) {
            const c = id.replace('more_dept_','');
            const isUg = KB.departments.ug.find(x=>x.c===c);
            const d = isUg || KB.departments.pg.find(x=>x.c===c);
            if (d) {
                r.text += T(`Here are more options for **${d.n}**: ⬇️`, `Additional links for ${d.n}:`);
                if (KB.career_options[d.c]) r.buttons.push({l:'Top Career Options',a:'career_'+d.c,i:'🎯'});
                if (d.syllabus) r.buttons.push({l:'Syllabus',u:d.syllabus,i:'📚'});
                if (d.faculty) r.buttons.push({l:'Faculty',u:d.faculty,i:'👨‍🏫'});
                if (d.collab) r.buttons.push({l:'Collaborations',u:d.collab,i:'🤝'});
                if (d.labs) r.buttons.push({l:'Labs/Facilities',u:d.labs,i:'🧪'});
                r.buttons.push({l:'🔙 Back',a:'_back',i:'🔙'});
                r.noMenu = true;
                return r;
            }
        }
                // Handle Department Intake requests
        if (id && id.startsWith('intake_')) {
            const c = id.replace('intake_','');
            const d = KB.departments.ug.find(x=>x.c===c) || KB.departments.pg.find(x=>x.c===c);
            if (d) {
                if (d.intake) {
                    r.text += T(`The intake for **${d.n}** is **${d.intake}** seats! 🎓`, `The intake for ${d.n} is ${d.intake} seats.`);
                } else {
                    r.text += T(`I don't have the specific intake numbers for **${d.n}**.`, `Intake numbers for ${d.n} are currently unavailable.`);
                }
                r.buttons = [{l:'Department Info',a:'dept_'+c,i:'📚'}, {l:'All Intakes',a:'intake',i:'🎓'}];
                return r;
            }
        }

        if (id && id.startsWith('cs_spec_')) {
            const specId = id.replace('cs_spec_', '');
            const specData = KB.placement_stats[specId];
            if (specData) {
                r.text += T(`Here are the ongoing placement statistics for **${specData.name}**: 📊\n\n`, `Ongoing Placement Statistics for ${specData.name}:\n\n`);
                const prog = specData.ongoing;
                r.text += `**${prog.name}**\n`;
                r.text += `  **Number of companies visited:** ${prog.companies}\n`;
                r.text += `  **Number of offers made:** ${prog.offers}\n`;
                r.text += `  **Number of students selected:** ${prog.students}\n`;
                r.text += `  **Average Salary:** ${prog.avg}\n`;
                r.text += `  **Maximum salary:** ${prog.max}\n\n`;
                
                r.buttons = [];
                if (specData.full && specData.full.length > 0) {
                    r.buttons.push({l: 'View Full Year-wise Stats 📊', a: `cs_full_${specId}`, i: '📅'});
                }
                r.buttons.push({l: 'Back to CSE Branches', a: specId.includes('mtech') || specId.includes('cne') ? 'plcmt_cs_pg' : 'plcmt_cs_ug', i: '🔙'});
                return r;
            }
        }
        
        if (id && id.startsWith('cs_full_')) {
            const specId = id.replace('cs_full_', '');
            const specData = KB.placement_stats[specId];
            if (specData && specData.full) {
                r.text += T(`Here are the full year-wise placement statistics for **${specData.name}**: 📊\n\n`, `Full Year-wise Placement Statistics for ${specData.name}:\n\n`);
                specData.full.forEach(prog => {
                    r.text += `**${prog.name}**\n`;
                    r.text += `  **Number of companies visited:** ${prog.companies}\n`;
                    r.text += `  **Number of offers made:** ${prog.offers}\n`;
                    r.text += `  **Number of students selected:** ${prog.students}\n`;
                    r.text += `  **Average Salary:** ${prog.avg}\n`;
                    r.text += `  **Maximum salary:** ${prog.max}\n\n`;
                });
                r.buttons = [{l: 'Back', a: `cs_spec_${specId}`, i: '🔙'}];
                return r;
            }
        }

        // Handle Full Stats for departments
        if (id && id.startsWith('plcmt_full_')) {
            const originalId = id.replace('plcmt_full_', '');
            let c = originalId;
            let isUG = false, isPG = false;
            if (c.endsWith('_ug')) { isUG = true; c = c.replace('_ug', ''); }
            else if (c.endsWith('_pg')) { isPG = true; c = c.replace('_pg', ''); }
            
            let stats = KB.placement_stats[c];
            if (stats) {
                if (isUG && stats.ug) stats = stats.ug;
                else if (isPG && stats.pg) stats = stats.pg;
                
                if (stats.full) {
                    r.text += T(`Here are the full year-wise placement statistics for **${stats.name || KB.departments[isPG ? 'pg' : 'ug'].find(x=>x.c===c)?.n}**: 📊\n\n`, `Full Year-wise Placement Statistics:\n\n`);
                    stats.full.forEach(prog => {
                        r.text += `**${prog.name}**\n`;
                        r.text += `  **Number of companies visited:** ${prog.companies}\n`;
                        r.text += `  **Number of offers made:** ${prog.offers}\n`;
                        r.text += `  **Number of students selected:** ${prog.students}\n`;
                        r.text += `  **Average Salary:** ${prog.avg}\n`;
                        r.text += `  **Maximum salary:** ${prog.max}\n\n`;
                    });
                    r.buttons = [{l: 'Back', a: `plcmt_${originalId}`, i: '🔙'}];
                    return r;
                }
            }
        }

        // Handle Department Placement requests
        if (id && id.startsWith('plcmt_')) {
            const originalId = id.replace('plcmt_','');
            let c = originalId;
            let isUG = false, isPG = false;
            if (c.endsWith('_ug')) { isUG = true; c = c.replace('_ug', ''); }
            else if (c.endsWith('_pg')) { isPG = true; c = c.replace('_pg', ''); }

            const d = KB.departments.ug.find(x=>x.c===c) || KB.departments.pg.find(x=>x.c===c);
            let rawStats = KB.placement_stats[c];
            
            if (d) {
                if (rawStats) {
                    if (!isUG && !isPG && (rawStats.ug || rawStats.pg)) {
                        // Check if a year is requested
                        if (typeof SESSION !== 'undefined' && SESSION.reqYear) {
                            if (rawStats.ug) { isUG = true; }
                            else if (rawStats.pg) { isPG = true; }
                        } else {
                            r.text += T(`The **${d.n}** department has both UG and PG programs. Which placement statistics would you like to view? 📊`, 
                                        `Select the program level for ${d.n} placements:`);
                            r.buttons = [];
                            if (rawStats.ug) r.buttons.push({l: 'UG Programs (B.E.) 🎓', a: `plcmt_${c}_ug`, i: '🎓'});
                            if (rawStats.pg) r.buttons.push({l: 'PG Programs (M.Tech/MCA) 🎓', a: `plcmt_${c}_pg`, i: '🎓'});
                            r.buttons.push({l: 'Other Departments', a: 'dept_placements_list', i: '📋'});
                            return r;
                        }
                    }

                    let stats = rawStats;
                    if (isUG && stats.ug) stats = stats.ug;
                    else if (isPG && stats.pg) stats = stats.pg;

                    // Year-specific logic
                    if (typeof SESSION !== 'undefined' && SESSION.reqYear) {
                        const requestedYears = SESSION.reqYear.split(' & ');
                        let foundProgs = [];
                        let missingYears = [];

                        requestedYears.forEach(yr => {
                            let specificProg = null;
                            if (stats.full) specificProg = stats.full.find(p => p.name && p.name.includes(yr));
                            if (!specificProg && stats.programs) specificProg = stats.programs.find(p => p.name && p.name.includes(yr));
                            if (!specificProg && stats.ongoing && !Array.isArray(stats.ongoing) && (stats.ongoing.name||'').includes(yr)) specificProg = stats.ongoing;
                            if (!specificProg && Array.isArray(stats.ongoing)) specificProg = stats.ongoing.find(p => p.name && p.name.includes(yr));
                            
                            if (specificProg) {
                                foundProgs.push({ yr, prog: specificProg });
                            } else {
                                missingYears.push(yr);
                            }
                        });
                        
                        if (foundProgs.length > 0) {
                            r.text += T(`Here are the placement highlights for **${d.n}** for the year(s) ${SESSION.reqYear}: 🚀\n\n`, `Detailed Placement Statistics for ${d.n} (${SESSION.reqYear}):\n\n`);
                            foundProgs.forEach(item => {
                                r.text += `**${item.prog.name}**\n`;
                                r.text += `• **Number of companies visited:** ${item.prog.companies}\n`;
                                r.text += `• **Number of offers made:** ${item.prog.offers}\n`;
                                r.text += `• **Number of students selected:** ${item.prog.students}\n`;
                                r.text += `• **Average Salary:** ${item.prog.avg}\n`;
                                r.text += `• **Maximum salary:** ${item.prog.max}\n\n`;
                            });
                            
                            if (missingYears.length > 0) {
                                r.text += T(`*(Note: We couldn't find specific placement records for the year(s) ${missingYears.join(', ')}.)*\n\n`, `*(Note: We couldn't find specific placement records for the year(s) ${missingYears.join(', ')}.)*\n\n`);
                            }
                            
                            r.buttons = [{l: 'View All Years 📊', a: `plcmt_${c}${isUG?'_ug':(isPG?'_pg':'')}`, i: '📅'}];
                            return r;
                        } else {
                            r.text += T(`No placement record of academic year ${SESSION.reqYear} found for ${d.n}.`, `No placement record of academic year ${SESSION.reqYear} found for ${d.n}.`);
                            r.buttons = [{l: 'View All Available Years 📊', a: `plcmt_${c}${isUG?'_ug':(isPG?'_pg':'')}`, i: '📅'}, {l: 'Other Departments', a: 'dept_placements_list', i: '📋'}];
                            return r;
                        }
                    } else {
                        r.text += T(`Here are the placement highlights for **${d.n}**: 🚀\n\n`, `Detailed Placement Statistics for ${d.n}:\n\n`);
                    }
                    
                    if (stats.ongoing) {
                        const progs = Array.isArray(stats.ongoing) ? stats.ongoing : [stats.ongoing];
                        progs.forEach(prog => {
                            r.text += `**${prog.name}**\n`;
                            r.text += `• **Number of companies visited:** ${prog.companies}\n`;
                            r.text += `• **Number of offers made:** ${prog.offers}\n`;
                            r.text += `• **Number of students selected:** ${prog.students}\n`;
                            r.text += `• **Average Salary:** ${prog.avg}\n`;
                            r.text += `• **Maximum salary:** ${prog.max}\n\n`;
                        });
                        
                        r.buttons = [];
                        if (stats.full && stats.full.length > 0) {
                            r.buttons.push({l: 'View Full Year-wise Stats 📊', a: `plcmt_full_${originalId}`, i: '📅'});
                        }
                    } else if (stats.programs) {
                        stats.programs.forEach(prog => {
                            r.text += `**${prog.name}**\n`;
                            r.text += `• **Number of companies visited:** ${prog.companies}\n`;
                            r.text += `• **Number of offers made:** ${prog.offers}\n`;
                            r.text += `• **Number of students selected:** ${prog.students}\n`;
                            r.text += `• **Average Salary:** ${prog.avg}\n`;
                            r.text += `• **Maximum salary:** ${prog.max}\n\n`;
                        });
                        r.buttons = [];
                    } else if (stats.companies !== undefined) {
                        r.text += `• **Number of companies visited:** ${stats.companies}\n`;
                        r.text += `• **Number of offers made:** ${stats.offers}\n`;
                        r.text += `• **Number of students selected:** ${stats.students}\n`;
                        r.text += `• **Average Salary:** ${stats.avg}\n`;
                        r.text += `• **Maximum salary:** ${stats.max}\n`;
                        r.buttons = [];
                    } else {
                        r.text += `*Placement statistics are currently being updated for this department.*\n`;
                        r.buttons = [];
                    }
                    
                    r.text += `\n**Top Recruiting Companies across RVCE:**\n${KB.placements.recruiters}\n`;
                    
                    if (d.placement) {
                        r.buttons.push({l: 'Official Portal', u: d.placement, i: '🌐'});
                    }
                    r.buttons.push({l: 'Other Departments', a: isPG ? 'plcmt_pg_categories' : (isUG ? 'plcmt_ug_categories' : 'dept_placements_list'), i: '📋'}, {l: 'General Placements', a: 'placements', i: '💼'});
                } else if (d.placement) {
                    r.text += T(`The **${d.n}** department has an excellent placement record! 💼\n\nYou can view the latest statistics, top recruiters, and placement highlights for this branch here:`, `Detailed Placement Information for ${d.n}:`);
                    r.buttons = [{l: d.n + ' Placements', u: d.placement, i: '📈'}, {l: 'General Placements', a: 'placements', i: '💼'}];
                } else {
                    r.text += T(`You can find the placement information for **${d.n}** on the department's main page or by contacting the placement cell.`, `Placements for ${d.n}:`);
                    r.buttons = [{l: d.n + ' Main Page', u: d.u, i: '🌐'}, {l: 'General Placements', a: 'placements', i: '💼'}];
                }
                return r;
            }
        }

        // Handle Top Career Options requests
        if (id && id.startsWith('career_')) {
            const c = id.replace('career_','');
            const d = KB.departments.ug.find(x=>x.c===c) || KB.departments.pg.find(x=>x.c===c);
            const careers = KB.career_options[c];
            if (d) {
                if (careers) {
                    r.text += T(`Here are the Top Career Options for **${d.n}**: 🎯\n\n`, `Top Career Options for ${d.n}:\n\n`);
                    for (const [program, roles] of Object.entries(careers)) {
                        r.text += `**${program}**\n`;
                        roles.forEach(role => {
                            r.text += `• ${role}\n`;
                        });
                        r.text += `\n`;
                    }
                } else {
                    r.text += `Sorry, we don't have the specific career options for **${d.n}** available right now.`;
                }
                r.buttons = [{l:'Main Page',u:d.u,i:'🌐'}];
                if (d.about) r.buttons.push({l:'About Dept',u:d.about,i:'ℹ️'});
                if (d.placement) r.buttons.push({l:'Placements',u:d.placement,i:'💼'});
                r.buttons.push({l:'All Departments',a:'departments',i:'🔙'});
                r.buttons.push({l:'More Options 🔽',a:'more_dept_'+d.c,i:'➕'});
                r.noMenu = true;
                return r;
            }
        }
        // Handle specific COE intents (coe_mfc, coe_cisss, coe_benz, etc.)
        if (id && id.startsWith('coe_')) {
            const coe = KB.general.coes_db.find(c => c.id === id);
            if (coe) {
                r.text = T(
                    coe.emoji + ' **' + coe.n + '**\n\n' + coe.info,
                    coe.emoji + ' ' + coe.n + '\n\nDepartment: ' + coe.dept + (coe.partner ? '\nIndustry Partner: ' + coe.partner : '') + '\n\n' + coe.info
                );
                r.text += '\n\n\u2022 **Department:** ' + coe.dept;
                if (coe.partner) r.text += '\n\u2022 **Industry Partner:** ' + coe.partner;
                if (coe.year) r.text += '\n\u2022 **Established:** ' + coe.year;
                r.buttons = [
                    {l: 'Visit CoE Page \ud83c\udf10', u: coe.url, i: '\ud83c\udf10'},
                    {l: 'All CoEs \ud83d\udd2c', a: 'centres_of_excellence', i: '\ud83d\udd2c'},
                    {l: 'Research \ud83d\udcda', a: 'research', i: '\ud83d\udcda'}
                ];
                var relatedCoes = KB.general.coes_db.filter(function(c) { return c.id !== id && c.dept === coe.dept; }).slice(0, 2);
                relatedCoes.forEach(function(rc) { r.buttons.push({l: rc.emoji + ' ' + rc.n.split('(')[0].trim(), a: rc.id, i: rc.emoji}); });
                return r;
            }
        }
        r.text = T("Hmm \ud83e\udd14 I didn't get that. Try one of these:","I didn't understand that query. Here are some options:");
        r.noMenu = true; return r;
    }

    // Append dynamic follow-up suggestions
    const followUps = getFollowUps(id);
    if (!r.noMenu) {
        r.buttons = [...(r.buttons || []), ...followUps];
    }

    return r;
}

/* =============== DOM =============== */
const $=s=>document.getElementById(s);
const chatW=$('chatWindow'),fab=$('chatFab'),badge=$('fabBadge'),msgs=$('chatMessages');
const typing=$('typingIndicator'),inp=$('userInput'),sendB=$('sendBtn');
const toneS=$('toneSwitch'),toneL=$('toneLabel'),emojiB=$('emojiBtn'),micB=$('micBtn'),sugs=$('quickSuggestions'),clearB=$('clearBtn');

fab.addEventListener('click',()=>{chatOpen=!chatOpen;chatW.classList.toggle('open',chatOpen);fab.classList.toggle('active',chatOpen);fab.setAttribute('aria-expanded',chatOpen);if(chatOpen){badge.classList.add('hidden');inp.focus();} if(typeof saveState!=='undefined')saveState();});
toneS.addEventListener('click',()=>{tone=tone==='funny'?'pro':'funny';toneS.classList.toggle('pro',tone==='pro');toneS.setAttribute('aria-checked',tone==='pro');toneL.textContent=tone==='funny'?'Funny':'Professional'; if(typeof saveState!=='undefined')saveState();});
toneS.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toneS.click();}});
emojiB.addEventListener('click',()=>{disOld();showMenu();});
sugs.querySelectorAll('.suggestion-chip').forEach(c=>c.addEventListener('click',()=>process(c.dataset.query)));
sendB.addEventListener('click',()=>{const t=inp.value.trim();if(t)process(t);});
inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const t=inp.value.trim();if(t){ document.getElementById('typeahead').classList.add('hidden'); process(t);}}});

// TYPEAHEAD SUGGESTIONS
const typeahead = document.getElementById('typeahead');
const POPULAR_QUERIES = [
    "Tell me about the boys hostels",
    "What is the fee structure?",
    "Show me placement statistics",
    "Who is the HOD?",
    "What are the admission rules?",
    "How do I apply for management quota?",
    "What is the cutoff rank for CSE?",
    "Can you show me the syllabus?",
    "Are there any innovation clubs?",
    "What is the dress code?",
    "How is the mess food?"
];

inp.addEventListener('input', (e) => {
    if (!typeahead) return;
    const val = e.target.value.toLowerCase().trim();
    if (val.length < 2) {
        typeahead.classList.add('hidden');
        return;
    }
    
    const matches = POPULAR_QUERIES.filter(q => q.toLowerCase().includes(val)).slice(0, 4);
    
    if (matches.length === 0) {
        typeahead.classList.add('hidden');
        return;
    }
    
    typeahead.innerHTML = matches.map(m => `<div class="typeahead-item">${m}</div>`).join('');
    typeahead.classList.remove('hidden');
    
    typeahead.querySelectorAll('.typeahead-item').forEach(item => {
        item.addEventListener('click', () => {
            inp.value = item.innerText;
            typeahead.classList.add('hidden');
            process(item.innerText);
        });
    });
});

document.addEventListener('click', (e) => {
    if (typeahead && !typeahead.contains(e.target) && e.target !== inp) {
        typeahead.classList.add('hidden');
    }
});
if(clearB) clearB.addEventListener('click', () => {
    msgs.innerHTML = '';
    SafeStorage.removeItem('rvce_chat_html');
    saveState();
    setTimeout(() => {
        addBot(T("Hey there! 👋 Welcome to RVCE — the place where engineers are crafted! Ask me anything about admissions, placements, campus, and more!","Hello! Welcome to RV College of Engineering. I'm here to help you with information about admissions, placements, campus facilities, and more."),[],true);
        setTimeout(showMenu,900);
    }, 200);
});

// UI: Display Session ID
const sd = document.getElementById('sessionDisplay');
if (sd) sd.textContent = `Tracker ID: ${getSID()}`;

/* =============== VOICE RECOGNITION =============== */
let recognition;
let isRecording = false;
let isVoiceInteraction = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isRecording = true;
        micB.classList.add('recording');
        inp.placeholder = "Listening... 🎤";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        inp.value = transcript;
        isVoiceInteraction = true;
        setTimeout(() => process(transcript), 500);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopRecording();
    };

    recognition.onend = () => {
        stopRecording();
    };
}

function stopRecording() {
    isRecording = false;
    if(recognition) recognition.stop();
    micB.classList.remove('recording');
    inp.placeholder = "Ask me anything about RVCE...";
}

micB.addEventListener('click', () => {
    if (!recognition) {
        alert("Speech Recognition not supported in this browser. Try Chrome!");
        return;
    }
    if (isRecording) {
        stopRecording();
    } else {
        recognition.start();
    }
});

/* =============== TELEMETRY & QUEUE =============== */
/* =============== TELEMETRY & QUEUE =============== */
var currentSessionId = (function() {
    let sid = sessionStorage.getItem('rvce_sid');
    if (!sid) {
        sid = 'sid_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('rvce_sid', sid);
    }
    return sid;
})();

function getSID() {
    return currentSessionId;
}

let userLocation = { city: 'Unknown', country: 'Unknown' };
let locationFetched = false;

async function fetchUserLocation() {
    if (locationFetched) return;
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.city) userLocation.city = data.city;
        if (data.country_name) userLocation.country = data.country_name;
        locationFetched = true;
    } catch(e) { console.warn("Location fetch failed"); }
}
fetchUserLocation();

function getOS() {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return "Windows";
    if (/Mac/i.test(ua)) return "macOS";
    if (/Linux/i.test(ua)) return "Linux";
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    return "Unknown";
}

const telemetryQueue = [];
function processTelemetryQueue() {
    if (typeof rvceChatbotAjax === 'undefined' || !rvceChatbotAjax || !rvceChatbotAjax.ajaxUrl || !navigator.onLine || telemetryQueue.length === 0) return;
    const item = telemetryQueue[0];
    const formData = new FormData();
    formData.append('action', 'rvce_log_chat');
    formData.append('query', item.query);
    formData.append('intent_id', item.intent);
    fetch(rvceChatbotAjax.ajaxUrl, { method: 'POST', body: formData })
        .then(r => { if(r.ok) { telemetryQueue.shift(); processTelemetryQueue(); } })
        .catch(() => {}); // Keep in queue if it fails
}

function logChatInteraction(query, intent_id, metadata = {}) {
    // 0. Dual-Write Telemetry Engine hook
    if (typeof window.rvceTrackEvent === 'function') {
        window.rvceTrackEvent('message', { query: query, intent: intent_id, ...metadata });
    }

    // 1. WordPress logic (async queue)
    telemetryQueue.push({query, intent: intent_id, meta: metadata});
    processTelemetryQueue();

    // 2. Standalone logic (localStorage for offline fallback)
    const logEntry = { 
        s: currentSessionId, 
        q: query, 
        i: intent_id, 
        d: new Date().toISOString(),
        t: 'message',
        m: metadata,
        institute_id: 'rvce',
        api_key: 'rvce_key_12345',
        device: navigator.userAgent,
        deviceType: /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(navigator.userAgent) ? 'mobile' : /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(navigator.userAgent) ? 'tablet' : 'desktop',
        browserName: getBrowserName(),
        os: getOS(),
        city: userLocation.city,
        country: userLocation.country
    };

    try {
        const logs = JSON.parse(localStorage.getItem('rvce_standalone_logs') || '[]');
        logs.push(logEntry);
        if (logs.length > 2000) logs.shift(); // Increased to 2000 for micro-interactions
        localStorage.setItem('rvce_standalone_logs', JSON.stringify(logs));
    } catch(e) { console.warn("Local logging failed", e); }

    // 3. Global Cloud Logging (MongoDB API)
    const centralBase = (window.rvceChatbotSettings && window.rvceChatbotSettings.vercelUrl)
        ? window.rvceChatbotSettings.vercelUrl.replace(/\/+$/, '')
        : ((window.location.hostname === 'localhost' || window.location.protocol === 'file:') 
            ? 'http://localhost:3000' 
            : '');
    if (centralBase) {
        try {
            fetch(centralBase + '/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    institute_id: 'rvce',
                    api_key: 'rvce_key_12345',
                    sessionId: currentSessionId,
                    events: [{ eventType: 'message', data: { query: query, intent: intent_id, ...metadata } }]
                })
            }).catch(() => {});
        } catch(e) { /* silent fail */ }
    }
}

function getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes("Chrome") && !ua.includes("Edg") && !ua.includes("OPR")) return "Chrome";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Edg")) return "Edge";
    return "Other";
}

function logMicroInteraction(type, label, metadata = {}) {
    // 0. Dual-Write Telemetry Engine hook
    if (typeof window.rvceTrackEvent === 'function') {
        window.rvceTrackEvent(type, { elementId: label, elementText: label, ...metadata });
    }

    const logEntry = {
        s: currentSessionId,
        q: `[${type}] ${label}`,
        i: `${type}:${label}`,
        d: new Date().toISOString(),
        t: 'interaction',
        m: metadata,
        institute_id: 'rvce',
        api_key: 'rvce_key_12345',
        device: navigator.userAgent,
        deviceType: /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(navigator.userAgent) ? 'mobile' : /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(navigator.userAgent) ? 'tablet' : 'desktop',
        browserName: getBrowserName(),
        os: getOS(),
        city: userLocation.city,
        country: userLocation.country
    };

    try {
        const logs = JSON.parse(localStorage.getItem('rvce_standalone_logs') || '[]');
        logs.push(logEntry);
        if (logs.length > 2000) logs.shift();
        localStorage.setItem('rvce_standalone_logs', JSON.stringify(logs));
    } catch(e) { console.warn("Micro-interaction logging failed", e); }

    // Cloud logging
    const centralBase = (window.rvceChatbotSettings && window.rvceChatbotSettings.vercelUrl)
        ? window.rvceChatbotSettings.vercelUrl.replace(/\/+$/, '')
        : ((window.location.hostname === 'localhost' || window.location.protocol === 'file:') 
            ? 'http://localhost:3000' 
            : '');
    if (centralBase) {
        try {
            fetch(centralBase + '/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    institute_id: 'rvce',
                    api_key: 'rvce_key_12345',
                    sessionId: currentSessionId,
                    events: [{ eventType: type, data: { elementId: label, elementText: label, ...metadata } }]
                })
            }).catch(() => {});
        } catch(e) { /* silent fail */ }
    }
}

let isProcessing = false;
function process(rawText) {
    if(isProcessing) return;
    if (typeof SESSION !== 'undefined') SESSION.pendingOverflows = [];
    if(!navigator.onLine) {
        addBotWarn(T("Oops! You seem to be offline. Please check your connection. 📶", "No internet connection detected. Please check your network and try again."));
        return;
    }
    const text = rawText.trim().substring(0, 250);
    if(!text) return;

    if (text.toLowerCase() === 'test accordion' || text.toLowerCase() === 'demo accordion') {
        addUser(text);
        inp.value = '';
        disOld();
        showTyp();
        setTimeout(() => {
            hideTyp();
            const accordionHtml = `
                <div style="margin-bottom: 10px; font-weight: 500;">You asked about several topics. Here is everything you need:</div>
                <div class="demo-accordion">
                    <div class="demo-accordion-item" onclick="this.classList.toggle('active')">
                        <div class="demo-accordion-header">
                            <span>🎓 Admissions</span>
                            <span class="demo-accordion-icon">▼</span>
                        </div>
                        <div class="demo-accordion-body">
                            Admissions to RVCE are primarily through KCET, COMED-K, and Management Quota. <br><br><strong>Eligibility:</strong> Min 45% in PCM. <br><strong>Fees:</strong> Management quota ranges from ₹16L to ₹70L.
                        </div>
                    </div>
                    <div class="demo-accordion-item" onclick="this.classList.toggle('active')">
                        <div class="demo-accordion-header">
                            <span>💼 Placements</span>
                            <span class="demo-accordion-icon">▼</span>
                        </div>
                        <div class="demo-accordion-body">
                            <strong>Latest Stats (2026 Batch)</strong><br>
                            • Highest Package: ₹67 LPA<br>
                            • Average Package: ₹16.86 LPA<br>
                            • Offers: 698+ so far<br>
                            Companies include Microsoft, Google, Amazon, Cisco, and Mercedes-Benz.
                        </div>
                    </div>
                    <div class="demo-accordion-item" onclick="this.classList.toggle('active')">
                        <div class="demo-accordion-header">
                            <span>🏠 Hostels</span>
                            <span class="demo-accordion-icon">▼</span>
                        </div>
                        <div class="demo-accordion-body">
                            We have separate hostels for boys (Cauvery, Sir M.V, etc.) and girls. <br><br>• Security: 24/7 Wardens and guards.<br>• Food: Strictly vegetarian mess.<br>• Amenities: Wi-Fi, Gym, Reading rooms.
                        </div>
                    </div>
                </div>
            `;
            addBot(accordionHtml, [{l:'Ask another question', a:'menu'}], true);
        }, 600);
        return;
    }

    isProcessing = true;
    setTimeout(() => { isProcessing = false; }, 1000); // 1-second debounce

    // MODERATION CHECK — runs BEFORE intent matching (use original text)
    const mod = checkModeration(text);
    if (mod.blocked) {
        logChatInteraction(text, 'moderated_' + mod.type);
        addUser(text);
        inp.value = '';
        disOld();
        showTyp();
        setTimeout(()=>{hideTyp();addBotWarn(getModerationResponse(mod.type));},600);
        return;
    }

    // Always show the user's actual input text
    addUser(text);
    inp.value = '';
    disOld();



    // Classify the intent with confidence detection
    const result = classifyIntent(text);
    if (result && typeof SESSION !== 'undefined') {
        SESSION.reqYear = result.year || null;
    }

    // === MULTI-INTENT HANDLING ===
    if (result.type === 'multi') {
        logChatInteraction(text, 'multi_intent');

        let i = 0;
        const processNext = () => {
            if (i >= result.ids.length) return;
            showTyp();
            setTimeout(() => {
                hideTyp();
                const resp = getResponse(result.ids[i]);
                if (resp) {
                    const isLast = (i === result.ids.length - 1);
                    const cloned = isLast ? resp : { ...resp, buttons: [], noMenu: true };

                    if (isLast && result.overflow && result.overflow.length > 0) {
                        if (typeof SESSION !== 'undefined') {
                            SESSION.pendingOverflows = [...result.overflow];
                        }
                        // Limit to maximum of 5 overflow buttons to prevent screen flooding
                        const overflowButtons = result.overflow.slice(0, 5).map(overflowId => {
                            const qa = QA.find(q => q.id === overflowId);
                            const label = INTENT_LABELS[overflowId] || (qa ? qa.k[0] : overflowId);
                            return { l: label, a: overflowId, i: '👉', isOverflow: true };
                        });
                        
                        // Append a Back button at the end
                        overflowButtons.push({ l: 'Back', a: '_back', i: '⬅️', isOverflow: true });

                        cloned.buttons = [...(cloned.buttons || []), ...overflowButtons];
                    }

                    botReply(cloned);
                }
                i++;
                if (i < result.ids.length) {
                    setTimeout(processNext, 600); // Wait before starting to type next message
                }
            }, 800);
        };
        processNext();
        return;
    }

    // === MULTI-TURN CONTEXT HANDLING ===
    if (result.type === 'context') {
        logChatInteraction(text, result.id);
        const ctxId = result.id;

        if (ctxId === '_more') {
            // "Tell me more" — provide deeper info on last topic
            if (SESSION.lastIntent) {
                const deepInfo = getDeepInfo(SESSION.lastIntent);
                if (deepInfo) { botReply(deepInfo); return; }
            }
            // Fallback: show menu
            botReply({ text: T("I'd love to tell you more! What topic are you interested in? 🤔","What topic would you like more information about?"), buttons: [], noMenu: true });
            setTimeout(showMenu, 600);
            return;
        }

        if (ctxId === '_back') {
            // Go back to previous topic
            if (SESSION.navStack.length > 1) {
                SESSION.navStack.pop(); // Remove current
                const prevId = SESSION.navStack[SESSION.navStack.length - 1];
                SESSION.lastIntent = prevId;
                botReply(getResponse(prevId));
            } else {
                botReply({ text: T("Let's go back to the main menu! 📋","Returning to the main menu."), buttons: [], noMenu: true });
                setTimeout(showMenu, 600);
            }
            return;
        }

        if (ctxId === '_what_else') {
            // Show related topics
            if (SESSION.lastIntent) {
                const related = getRelatedTopics(SESSION.lastIntent);
                botReply(related);
            } else {
                setTimeout(showMenu, 300);
            }
            return;
        }

        if (ctxId === '_yes') {
            // Affirmative — re-run last intent or show menu
            if (SESSION.lastIntent && SESSION.lastIntent !== 'greet') {
                const deepInfo = getDeepInfo(SESSION.lastIntent);
                if (deepInfo) { botReply(deepInfo); return; }
            }
            setTimeout(showMenu, 300);
            return;
        }

        if (ctxId === '_no') {
            botReply({ text: T("No worries! Let me know if you need anything else 😊","Understood. Feel free to ask about any other topic."), buttons: [], noMenu: true });
            setTimeout(showMenu, 800);
            return;
        }
    }

    if (result.type === 'exact') {
        logChatInteraction(text, result.id);
        // Track navigation history
        if (!result.id.startsWith('_') && result.id !== 'menu' && result.id !== 'greet') {
            if (SESSION.navStack.length === 0 || SESSION.navStack[SESSION.navStack.length - 1] !== result.id) {
                SESSION.navStack.push(result.id);
                if (SESSION.navStack.length > 10) SESSION.navStack.shift();
            }
        }
        // High confidence — exact keyword or button click, respond directly
        const id = result.id;
        if (id === 'greet') { botReply(getResponse('greet')); setTimeout(showMenu,1200); }
        else if (id === 'menu') { setTimeout(showMenu,300); }
        else { botReply(getResponse(id)); }
    } else if (result.type === 'keyword') {
        logChatInteraction(text, result.id);
        // Track navigation history
        if (!result.id.startsWith('_') && result.id !== 'menu' && result.id !== 'greet') {
            if (SESSION.navStack.length === 0 || SESSION.navStack[SESSION.navStack.length - 1] !== result.id) {
                SESSION.navStack.push(result.id);
                if (SESSION.navStack.length > 10) SESSION.navStack.shift();
            }
        }
        // Medium confidence — keyword found in sentence
        // Show "Did you mean?" header + actual content below
        const primaryId = result.id;
        const primaryLabel = INTENT_LABELS[primaryId] || primaryId;
        const actualResponse = getResponse(primaryId);
        
        // Build combined response: "Did you mean?" + actual content
        const r = { text: '', buttons: [], noMenu: false };
        r.text = T(
            "I think you meant **" + primaryLabel + "**! 🤔\n\n" + (actualResponse.text || ''),
            "Did you mean **" + primaryLabel + "**?\n\n" + (actualResponse.text || '')
        );
        // Use the actual response buttons + add alternatives
        const otherSuggestions = findSuggestions(text).filter(s => s !== primaryId).slice(0, 2);
        r.buttons = [...(actualResponse.buttons || [])];
        if (otherSuggestions.length > 0) {
            otherSuggestions.forEach(sid => {
                r.buttons.push({ l: INTENT_LABELS[sid] || sid, a: sid, i: '🔍' });
            });
        }
        r.noMenu = actualResponse.noMenu || false;
        botReply(r);
    } else if (result.type === 'fuzzy') {
        logChatInteraction(text, 'fuzzy_match', { 
            suggestions: result.suggestions.map(id => INTENT_LABELS[id] || id).join(', ') 
        });
        // Low confidence — no exact keyword, fuzzy match found
        const r = { text: '', buttons: [], noMenu: false };
        r.text = T(
            "Hmm 🤔 I didn't quite get that! Did you mean:",
            "I couldn't find an exact match. Did you mean:"
        );
        r.buttons = result.suggestions.map(sid => ({
            l: INTENT_LABELS[sid] || sid,
            a: sid,
            i: '🔍'
        }));
        botReply(r);
    } else if (result.type === 'fac_multi') {
        logChatInteraction(text, 'fac_multi');
        const btns = result.matches.slice(0, 8).map(m => {
            const slug = m.f.n.toLowerCase().replace(/[^a-z0-9]/g, '');
            return { l: `${m.f.n} (${m.d.toUpperCase()})`, a: `fac_${slug}`, i: '👨‍🏫' };
        });
        botReply({
            text: T(`I found **${result.matches.length}** faculty members matching your search. Who are you looking for?`, `I found multiple faculty members. Please choose one:`),
            buttons: btns,
            noMenu: true
        });
    } else {
        // === DIRECT FACULTY HOOK (Fail-Safe v3.3.3) — Last Resort ===
        const cleanText = text.toLowerCase().replace(/\b(view|profile|of|show|who|is|details|faculty|professor|teacher|dr|prof|mr|ms|mrs|assistant|associate|head|department|dept)\b/g, '').replace(/[^a-z]/g, '').trim();
        const s = cleanText.length >= 3 ? cleanText : text.toLowerCase().replace(/[^a-z]/g, '');
        if (s.length >= 3 && KB.faculty) {
            const matches = [];
            for (const dept in KB.faculty) {
                for (const f of KB.faculty[dept]) {
                    const fn = f.n.toLowerCase().replace(/[^a-z]/g, '');
                    const pn = f.n.replace(/Dr\.|Prof\.|Mr\.|Assistant Prof/gi, '').toLowerCase().replace(/[^a-z]/g, '');
                    if (fn.includes(s) || pn.includes(s) || (s.length > 5 && s.includes(pn))) {
                        matches.push({f, d: dept});
                    }
                }
            }
            
            if (matches.length === 1) {
                const f = matches[0].f;
                const slug = f.n.toLowerCase().replace(/[^a-z0-9]/g, '');
                logChatInteraction(text, `fac_${slug}`);
                botReply(getResponse(`fac_${slug}`));
                return;
            } else if (matches.length > 1) {
                logChatInteraction(text, 'fac_multi');
                const btns = matches.slice(0, 8).map(m => {
                    const slug = m.f.n.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return { l: `${m.f.n} (${m.d.toUpperCase()})`, a: `fac_${slug}`, i: '👨‍🏫' };
                });
                botReply({
                    text: T(`I found **${matches.length}** faculty members matching your search. Who are you looking for?`, `I found multiple faculty members. Please choose one:`),
                    buttons: btns,
                    noMenu: true
                });
                return;
            }
        }

        logChatInteraction(text, 'unmatched');
        // No match at all
        const r = { text: '', buttons: [], noMenu: false };
        r.text = T(
            "Sorry, I couldn't find anything for that! 😅 Try something from the menu:",
            "I'm sorry, I don't have information on that topic. Please choose from the menu below:"
        );
        r.noMenu = true;
        botReply(r);
        setTimeout(showMenu, 600);
    }
}

function renderDepartment(d) {
    if (!d) return { text: T("I couldn't find details for that department. Please try again or check the main menu. 📋", "I couldn't find details for that department. Please try again or check the main menu."), buttons: [{l:'Main Menu',a:'menu',i:'📋'}] };
    const r = { text: '', buttons: [], noMenu: false };
    const hod = d.hod || "Faculty Leadership";
    let extraInfo = '';
    if (d.intake) extraInfo += `\n🎓 Intake: ${d.intake}`;
    if (d.accreditation) extraInfo += `\n💎 Accreditation: ${d.accreditation}`;
    
    r.text = T(
        `**${d.n}** 🎯\n👨‍🏫 HOD: ${hod}${extraInfo}\n\n*${d.info || "Explore the options below to learn more about this department."}*`,
        `Department: ${d.n}\nHead of Department: ${hod}${extraInfo}\n\n${d.info || ""}`
    );
    r.buttons = [{l:'Main Page',u:d.u,i:'🌐'}];
    if (d.about) r.buttons.push({l:'About Dept',u:d.about,i:'ℹ️'});
    if (d.placement) r.buttons.push({l:'Placements',u:d.placement,i:'💼'});
    r.buttons.push({l:'All Departments',a:'departments',i:'🔙'});
    r.buttons.push({l:'More Options 🔽',a:'more_dept_'+d.c,i:'➕'});
    r.noMenu = true;
    return r;
}

function renderFaculty(f, deptCode) {
    if (!f) return { text: "Faculty info not found.", buttons: [] };
    const deptObj = KB.departments.ug.find(d => d.c === deptCode) || KB.departments.pg.find(d => d.c === deptCode);
    const deptName = deptObj?.n || deptCode.toUpperCase();
    
    const isDeans = deptCode === 'deans';
    const affilLabel = isDeans ? "Administration" : `**${deptName}** department`;
    const btnLabel = isDeans ? "Administration" : `${deptCode.toUpperCase()} Dept`;
    const btnIcon = isDeans ? "🏢" : "🏫";

    return {
        text: T(
            `Found them! 👨‍🏫 **${f.n}** is part of the ${affilLabel}.\n\n**Designation:** ${f.d}\n**Teaching Experience:** ${f.e || "Not specified"}`,
            `Faculty: ${f.n}\nAffiliation: ${isDeans ? "Administration" : deptName}\nDesignation: ${f.d}\nExperience: ${f.e || "Not specified"}`
        ),
        buttons: [
            {l: 'View Profile', u: f.u, i: '🌐', track: f.n},
            {l: btnLabel, a: isDeans ? 'deans_list' : `dept_${deptCode}`, i: btnIcon}
        ]
    };
}

function trackInteraction(type, label) {
    logMicroInteraction(type, label);
}

/* =============== MESSAGE RENDERING =============== */
function addUser(text) {
    const m=document.createElement('div'); m.className='message user';
    m.innerHTML=`<div class="msg-av"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="msg-body"><div class="msg-bubble">${esc(text)}</div></div>`;
    msgs.appendChild(m); scr();
}

function addBot(text, buttons, noMenu) {
    const m=document.createElement('div'); m.className='message bot';
    let bh='';
    if(buttons && buttons.length){
        bh='<div class="msg-btns">';
        
        const normalBtns = buttons.filter(b => !b.isOverflow);
        const overflowBtns = buttons.filter(b => b.isOverflow);

        normalBtns.forEach(b=>{
            let label = b.l;
            if (b.i) label = label.replace(b.i, '').trim();
            
            if(b.u) {
                const trackFn = b.track ? `trackInteraction('fac_profile_click', '${b.track}');` : '';
                bh+=`<a class="act-btn lk" href="${b.u}" target="_blank" rel="noopener noreferrer" onclick="${trackFn}">${b.i||'🌐'} ${label} 🌐</a>`;
            }
            else bh+=`<button class="act-btn" data-action="${b.a}">${b.i||''} ${label}</button>`;
        });
        
        // Only add universal menu if not explicitly suppressed AND not already in button list
        const hasMenu = buttons.some(b => b.a === 'menu');
        const hasBack = buttons.some(b => b.a === '_back');
        // Always add Back button if there's history, even if noMenu is true
        if (!hasBack && typeof SESSION !== 'undefined' && SESSION.navStack && SESSION.navStack.length > 1) {
            bh+=`<button class="act-btn mn" data-action="_back">🔙 Back</button>`;
        }
        if(!noMenu) {
            if (!hasMenu) {
                bh+=`<button class="act-btn mn" data-action="menu">📋 Main Menu</button>`;
            }
        }

        // Add visual divider and overflow buttons at the bottom
        if (overflowBtns.length > 0) {
            bh += `<div class="overflow-divider"><span>⬇️ Also Asked ⬇️</span></div>`;
            overflowBtns.forEach(b=>{
                let label = b.l;
                if (b.i) label = label.replace(b.i, '').trim();
                bh+=`<button class="act-btn overflow-btn" data-action="${b.a}">${b.i||''} ${label}</button>`;
            });
        }

        bh+='</div>';
    } else {
        // If there were no buttons provided initially
        const showBack = typeof SESSION !== 'undefined' && SESSION.navStack && SESSION.navStack.length > 1;
        if (showBack || !noMenu) {
            bh='<div class="msg-btns">';
            if (showBack) {
                bh+=`<button class="act-btn mn" data-action="_back">🔙 Back</button>`;
            }
            if (!noMenu) {
                bh+=`<button class="act-btn mn" data-action="menu">📋 Main Menu</button>`;
            }
            bh+='</div>';
        }
    }
    
    // Simple markdown: **bold**, [links](url) and \n to <br>
    let fmt = (text||'').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    fmt = fmt.replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
        let icon = '';
        if (url.startsWith('http')) icon = '🌐 ';
        else if (url.startsWith('tel:')) icon = '📞 ';
        else if (url.startsWith('mailto:')) icon = '✉️ ';
        return `<a href="${url}" target="_blank">${icon}${text}</a>`;
    });
    fmt = fmt.replace(/\n/g,'<br>');
    
    m.innerHTML=`<div class="msg-av"><img src="rvce_logo.png" alt="RVCE Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 5px; background-color: #fff; padding: 1px;"></div><div class="msg-body"><div class="msg-bubble">${fmt}</div>${bh}</div>`;
    msgs.appendChild(m);
    
    m.querySelectorAll('.act-btn[data-action]').forEach(b=>b.addEventListener('click',()=>{disOld();handleAction(b.dataset.action);}));
    scr();
}

function addBotWarn(text) {
    const m=document.createElement('div'); m.className='message bot';
    m.innerHTML=`<div class="msg-av"><img src="rvce_logo.png" alt="RVCE Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 5px; background-color: #fff; padding: 1px;"></div><div class="msg-body"><div class="msg-bubble warn">${text.replace(/\n/g,'<br>')}</div><div class="msg-btns"><button class="act-btn mn" data-action="menu">📋 Main Menu</button></div></div>`;
    msgs.appendChild(m);
    m.querySelectorAll('.act-btn[data-action]').forEach(b=>b.addEventListener('click',()=>{disOld();handleAction(b.dataset.action);}));
    scr();
}





function renderHODCard(d) {
    const r = { text: '', buttons: [], noMenu: true };
    const html = `
<div class="hod-card">
    <div class="hod-main">
        <div class="hod-badge">Faculty Leadership</div>
        <div class="hod-head-info">
            <h3>${d.hod}</h3>
            <p>Head of Department</p>
        </div>
    </div>
    <div class="hod-bio-text">${d.hod_bio}</div>
    <div class="hod-details-grid">
        <div class="hod-detail-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            <span>Department: ${d.n}</span>
        </div>
        <div class="hod-detail-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>Location: RVCE Bengaluru</span>
        </div>
    </div>
</div>`;
    r.text = html;
    r.buttons = [
        {l:'Faculty List',u:d.faculty||d.u,i:'👨‍🏫'},
        {l:'Contact Page',u:d.u,i:'✉️'},
        {l:'Main Menu',a:'menu',i:'🔙'}
    ];
    return r;
}

function botReply(r) {
    if(!r) return;
    if (typeof window.rvceTrackEvent === 'function') {
        window.rvceTrackEvent('bot_reply', { botReply: r.text || '' });
    }
    showTyp();
    const d=400+Math.min((r.text||'').length*4,700);
    setTimeout(()=>{
        hideTyp();
        addBot(r.text, r.buttons, r.noMenu);
    },d);
}



function showMenu() {
    const btns=[
        {l:'About RVCE',a:'about_disambiguation',i:'🏫'},{l:'Admissions',a:'admissions',i:'🎓'},
        {l:'Departments',a:'departments',i:'📚'},{l:'Placements',a:'placements',i:'💼'},
        {l:'Campus Life',a:'campusLife',i:'🏕️'},{l:'Hostels',a:'hostels',i:'🏠'},
        {l:'Contact',a:'contact',i:'📞'},{l:'Website',u:KB.contact.website,i:'🌐'}
    ];
    showTyp();
    setTimeout(()=>{hideTyp();addBot(T("Pick your adventure! 🗺️","How can I help? Choose a topic:"),btns,true);},400);
}

function handleAction(a) { 
    if (a === 'menu') { showMenu(); return; } 
    if (a === '_back') {
        if (typeof SESSION !== 'undefined' && SESSION.navStack && SESSION.navStack.length > 1) {
            SESSION.navStack.pop();
            const prevId = SESSION.navStack[SESSION.navStack.length - 1];
            SESSION.lastIntent = prevId;
            botReply(getResponse(prevId));
        } else {
            showMenu();
        }
        return;
    }
    const r = getResponse(a); 
    if (!r) { showMenu(); return; } 

    if (typeof SESSION !== 'undefined' && SESSION.pendingOverflows) {
        const idx = SESSION.pendingOverflows.indexOf(a);
        if (idx !== -1) {
            SESSION.pendingOverflows.splice(idx, 1);
        }
        
        if (SESSION.pendingOverflows.length > 0) {
            const remainingOverflowBtns = SESSION.pendingOverflows.slice(0, 5).map(overflowId => {
                const qa = typeof QA !== 'undefined' ? QA.find(q => q.id === overflowId) : null;
                const label = (typeof INTENT_LABELS !== 'undefined' && INTENT_LABELS[overflowId]) || (qa ? qa.k[0] : overflowId);
                return { l: label, a: overflowId, i: '👉', isOverflow: true };
            });
            remainingOverflowBtns.push({ l: 'Back', a: '_back', i: '⬅️', isOverflow: true });
            r.buttons = [...(r.buttons || []), ...remainingOverflowBtns];
        }
    }
    
    // Update navStack for valid button clicks
    if (typeof SESSION !== 'undefined' && SESSION.navStack && !a.startsWith('_') && a !== 'menu' && a !== 'greet') {
        if (SESSION.navStack.length === 0 || SESSION.navStack[SESSION.navStack.length - 1] !== a) {
            SESSION.navStack.push(a);
            if (SESSION.navStack.length > 10) SESSION.navStack.shift();
        }
        SESSION.lastIntent = a;
    }
    
    botReply(r); 
}
function disOld() { msgs.querySelectorAll('.act-btn:not([disabled])').forEach(b=>b.disabled=true); }
function showTyp() { typing.classList.add('show'); scr(); }
function hideTyp() { typing.classList.remove('show'); }
function scr() { requestAnimationFrame(()=>{msgs.scrollTop=msgs.scrollHeight;}); }
function esc(t) { const d=document.createElement('div');d.textContent=t;return d.innerHTML; }

/* =============== PARTICLES =============== */
const cvs=$('particles'),ctx=cvs.getContext('2d');let pts=[];
function rz(){cvs.width=innerWidth;cvs.height=innerHeight;}
addEventListener('resize',rz);rz();
for(let i=0;i<50;i++)pts.push({x:Math.random()*cvs.width,y:Math.random()*cvs.height,vx:(Math.random()-0.5)*0.3,vy:(Math.random()-0.5)*0.3,r:Math.random()*2+0.5,a:Math.random()*0.3+0.1});
function draw(){
    ctx.clearRect(0,0,cvs.width,cvs.height);
    pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=cvs.width;if(p.x>cvs.width)p.x=0;if(p.y<0)p.y=cvs.height;if(p.y>cvs.height)p.y=0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(227,30,36,${p.a})`;ctx.fill();});
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<120){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=`rgba(227,30,36,${0.06*(1-d/120)})`;ctx.lineWidth=0.5;ctx.stroke();}}
    requestAnimationFrame(draw);
}
draw();

/* =============== SAFE STORAGE =============== */
const SafeStorage = {
    mem: {},
    setItem: function(k, v) { try { localStorage.setItem(k, v); } catch(e) { this.mem[k] = v; } },
    getItem: function(k) { try { return localStorage.getItem(k) || this.mem[k]; } catch(e) { return this.mem[k]; } },
    removeItem: function(k) { try { localStorage.removeItem(k); } catch(e) { delete this.mem[k]; } }
};

/* =============== STATE PERSISTENCE =============== */
function saveState() {
    SafeStorage.setItem('rvce_chat_html', msgs.innerHTML);
    SafeStorage.setItem('rvce_chat_tone', tone);
    SafeStorage.setItem('rvce_chat_open', chatOpen ? '1' : '0');
    SafeStorage.setItem('rvce_chat_time', Date.now().toString());
}

const msgObserver = new MutationObserver(() => saveState());
msgObserver.observe(msgs, { childList: true, subtree: true });

/* =============== INIT =============== */
setTimeout(()=>{
    let savedHtml = null;
    const time = SafeStorage.getItem('rvce_chat_time');
    // Clear history if older than 2 hours (7200000 ms)
    if (time && (Date.now() - parseInt(time) > 7200000)) {
        SafeStorage.removeItem('rvce_chat_html');
        SafeStorage.removeItem('rvce_chat_tone');
        SafeStorage.removeItem('rvce_chat_open');
        SafeStorage.removeItem('rvce_chat_time');
    } else {
        savedHtml = SafeStorage.getItem('rvce_chat_html');
    }

    if (savedHtml) {
        // Restore previous chat state instantly
        msgs.innerHTML = savedHtml;
        const savedTone = SafeStorage.getItem('rvce_chat_tone');
        if(savedTone === 'pro') { tone = 'pro'; toneS.classList.add('pro'); toneL.textContent = 'Professional'; }
        if(SafeStorage.getItem('rvce_chat_open') === '1') {
            chatOpen=true; chatW.classList.add('open'); fab.classList.add('active'); badge.classList.add('hidden');
        } else {
            chatOpen=false; badge.classList.add('hidden');
        }
        
        // Re-bind all historic action buttons
        msgs.querySelectorAll('.act-btn[data-action]').forEach(b => {
            if(!b.disabled) b.addEventListener('click',()=>{disOld();handleAction(b.dataset.action);});
        });
        scr();
    } else {
        // Standard first-time load
        chatOpen=true;chatW.classList.add('open');fab.classList.add('active');badge.classList.add('hidden');
        setTimeout(()=>{addBot(T("Hey there! 👋 Welcome to RVCE — the place where engineers are crafted! Ask me anything about admissions, placements, campus, and more!","Hello! Welcome to RV College of Engineering. I'm here to help you with information about admissions, placements, campus facilities, and more."),[],true);setTimeout(showMenu,900);},350);
    }

    /* =============== DEEP INTERACTION TRACKING =============== */

    // --- 1. CLICK TRACKING (every single click) ---
    document.addEventListener('click', (e) => {
        const target = e.target;
        
        // Suggestion Buttons
        if (target.closest('.act-btn')) {
            const btn = target.closest('.act-btn');
            const label = btn.textContent.trim();
            const action = btn.dataset.action || 'link';
            logMicroInteraction('click', `Button: ${label}`, { action, element: 'act-btn' });
            return;
        }
        // Links inside chat
        if (target.closest('a')) {
            const link = target.closest('a');
            logMicroInteraction('click', `Link: ${link.textContent.trim().substring(0, 60)}`, { url: link.href, element: 'a' });
            return;
        }
        // Tone Switch
        if (target.closest('.tone-sw') || target.closest('#tone-switch')) {
            logMicroInteraction('ui', 'Tone Toggle', { newTone: tone === 'funny' ? 'pro' : 'funny' });
            return;
        }
        // FAB open/close
        if (target.closest('.rv-fab')) {
            logMicroInteraction('ui', chatOpen ? 'Chat Closed' : 'Chat Opened');
            return;
        }
        // Close button
        if (target.closest('.rv-close')) {
            logMicroInteraction('ui', 'Chat Closed (X)');
            return;
        }
        // Mic button
        if (target.closest('#mic-btn') || target.closest('.mic-btn')) {
            logMicroInteraction('ui', 'Voice Input Triggered');
            return;
        }
        // Send button
        if (target.closest('#send-btn') || target.closest('.send-btn')) {
            logMicroInteraction('ui', 'Send Button Clicked');
            return;
        }
        // Any other click inside chatbot container
        if (target.closest('.rv-chatbot-wrap') || target.closest('#rv-chatbot')) {
            const tag = target.tagName.toLowerCase();
            const cls = target.className ? target.className.toString().substring(0, 40) : '';
            logMicroInteraction('click', `Element: ${tag}`, { class: cls });
        }
    });

    // --- 2. HOVER TRACKING (interest signals on buttons/links) ---
    let hoverTimer = null;
    document.addEventListener('mouseover', (e) => {
        const btn = e.target.closest('.act-btn');
        const link = e.target.closest('.msg-bubble a');
        const hoverTarget = btn || link;
        if (hoverTarget) {
            hoverTimer = setTimeout(() => {
                const label = hoverTarget.textContent.trim().substring(0, 60);
                logMicroInteraction('hover', label, { duration: '500ms+', element: hoverTarget.tagName });
            }, 500); // Only log if user hovers for 500ms+ (real interest)
        }
    });
    document.addEventListener('mouseout', (e) => {
        if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    });

    // --- 3. COPY TRACKING (high-value signal: user copied chatbot text) ---
    document.addEventListener('copy', () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            const copied = selection.toString().trim().substring(0, 100);
            logMicroInteraction('copy', copied, { length: selection.toString().length });
        }
    });

    // --- 4. TYPING VELOCITY (frustration/familiarity detector) ---
    let keyTimestamps = [];
    if (inp) {
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') return;
            keyTimestamps.push(Date.now());
        });
        // Log typing velocity when user submits (press Enter or click Send)
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && keyTimestamps.length > 2) {
                const intervals = [];
                for (let i = 1; i < keyTimestamps.length; i++) {
                    intervals.push(keyTimestamps[i] - keyTimestamps[i-1]);
                }
                const avgMs = Math.round(intervals.reduce((a,b) => a+b, 0) / intervals.length);
                const wpm = Math.round(60000 / (avgMs * 5)); // rough WPM
                logMicroInteraction('typing', `Speed: ${avgMs}ms/key (~${wpm} WPM)`, { avgMs, wpm, keyCount: keyTimestamps.length });
                keyTimestamps = [];
            }
        });
        // Input focus/blur
        inp.addEventListener('focus', () => {
            logMicroInteraction('focus', 'Input Focused');
        });
        inp.addEventListener('blur', () => {
            if (inp.value.trim()) {
                logMicroInteraction('blur', 'Input Blurred (with text)', { partial: inp.value.trim().substring(0, 50) });
            }
        });
    }

    // --- 5. SCROLL DEPTH (how far user reads in chat) ---
    let maxScrollPercent = 0;
    let scrollLogTimer = null;
    if (msgs) {
        msgs.addEventListener('scroll', () => {
            const scrollTop = msgs.scrollTop;
            const scrollHeight = msgs.scrollHeight - msgs.clientHeight;
            if (scrollHeight > 0) {
                const percent = Math.round((scrollTop / scrollHeight) * 100);
                if (percent > maxScrollPercent + 20) { // Log every 20% threshold
                    maxScrollPercent = percent;
                    clearTimeout(scrollLogTimer);
                    scrollLogTimer = setTimeout(() => {
                        logMicroInteraction('scroll', `Depth: ${maxScrollPercent}%`, { depth: maxScrollPercent });
                    }, 300);
                }
            }
        });
    }

    // --- 6. DWELL TIME (time spent with chat open per page session) ---
    let chatOpenedAt = chatOpen ? Date.now() : null;
    const origToggle = fab ? fab.onclick : null;
    // Observe chat open/close to measure dwell time
    const chatObserver = new MutationObserver(() => {
        if (chatW && chatW.classList.contains('open')) {
            if (!chatOpenedAt) chatOpenedAt = Date.now();
        } else {
            if (chatOpenedAt) {
                const dwellSec = Math.round((Date.now() - chatOpenedAt) / 1000);
                if (dwellSec >= 3) { // Only log if open for 3+ seconds
                    logMicroInteraction('dwell', `Chat open for ${dwellSec}s`, { seconds: dwellSec });
                }
                chatOpenedAt = null;
            }
        }
    });
    if (chatW) chatObserver.observe(chatW, { attributes: true, attributeFilter: ['class'] });

    // --- 7. PAGE VISIBILITY (did user switch tabs?) ---
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            logMicroInteraction('visibility', 'Tab Hidden (left page)');
        } else {
            logMicroInteraction('visibility', 'Tab Visible (returned)');
        }
    });

    // --- 8. SESSION END (before page unload) ---
    window.addEventListener('beforeunload', () => {
        if (chatOpenedAt) {
            const dwellSec = Math.round((Date.now() - chatOpenedAt) / 1000);
            logMicroInteraction('session', `Session ended (dwell: ${dwellSec}s)`, { totalDwell: dwellSec });
        }
        logMicroInteraction('session', 'Page Unload');
    });

    // --- 9. DEVICE TELEMETRY ---
    logChatInteraction('Session Start', 'device_info', { 
        userAgent: navigator.userAgent, 
        screen: window.innerWidth + 'x' + window.innerHeight 
    });

},600);

}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startRVCEChatbot);
} else {
    setTimeout(startRVCEChatbot, 100);
}
