import { SeedConfig } from './index';
import { v4 as uuidv4 } from 'uuid';

interface DocumentTemplate {
  title: string;
  content: string;
  subject: string;
  keywords: string[];
  abstract: string;
  authors: string[];
  publicationYear: number;
  citations: number;
}

export async function seedDocuments(supabase: any, config: SeedConfig) {
  console.log('  Creating sample documents...');

  // Get demo user
  const { data: demoUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'demo@praxis.edu')
    .single();

  if (!demoUser) {
    console.error('Demo user not found!');
    return;
  }

  const documents = generateDocuments();
  const createdDocs: any[] = [];

  for (const doc of documents) {
    const documentData = {
      id: uuidv4(),
      user_id: demoUser.id,
      title: doc.title,
      content: doc.content,
      file_path: `/documents/${doc.title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      file_size: Math.floor(Math.random() * 5000000) + 500000, // 0.5-5MB
      mime_type: 'application/pdf',
      subject: doc.subject,
      keywords: doc.keywords,
      abstract: doc.abstract,
      authors: doc.authors,
      publication_year: doc.publicationYear,
      citation_count: doc.citations,
      page_count: Math.floor(Math.random() * 40) + 10,
      language: 'en',
      document_type: 'research_paper',
      metadata: {
        doi: `10.1234/demo.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`,
        journal: getRandomJournal(doc.subject),
        conference: Math.random() > 0.7 ? getRandomConference(doc.subject) : null,
      },
      created_at: getRandomDate(90),
      updated_at: getRandomDate(30),
    };

    const { data, error } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();

    if (error) {
      console.error(`Error creating document "${doc.title}":`, error);
    } else {
      createdDocs.push(data);
      if (config.verbose) {
        console.log(`    ✓ Created: ${doc.title}`);
      }
    }
  }

  console.log(`    ✓ Created ${createdDocs.length} documents`);

  // Create citations between documents
  await createCitations(supabase, createdDocs);
}

function generateDocuments(): DocumentTemplate[] {
  const physicsDocuments: DocumentTemplate[] = [
    {
      title: "Quantum Entanglement in Multi-Particle Systems: A Comprehensive Review",
      content: generateLoremIpsum(5000),
      subject: "Physics",
      keywords: ["quantum entanglement", "multi-particle systems", "quantum mechanics", "bell states"],
      abstract: "This paper provides a comprehensive review of quantum entanglement phenomena in multi-particle systems, exploring recent advances in experimental verification and theoretical frameworks.",
      authors: ["Dr. Sarah Chen", "Prof. Michael Rodriguez"],
      publicationYear: 2024,
      citations: 145,
    },
    {
      title: "Applications of String Theory in Modern Cosmology",
      content: generateLoremIpsum(4500),
      subject: "Physics",
      keywords: ["string theory", "cosmology", "multiverse", "quantum gravity"],
      abstract: "We explore the implications of string theory for understanding cosmic inflation, dark energy, and the possibility of multiple universes.",
      authors: ["Prof. James Thompson", "Dr. Lisa Wang"],
      publicationYear: 2023,
      citations: 89,
    },
    {
      title: "Superconductivity at Room Temperature: Recent Breakthroughs",
      content: generateLoremIpsum(3800),
      subject: "Physics",
      keywords: ["superconductivity", "room temperature", "quantum materials", "cooper pairs"],
      abstract: "Recent discoveries in hydrogen-rich materials under extreme pressure have brought us closer to achieving room-temperature superconductivity.",
      authors: ["Dr. Ahmed Hassan", "Prof. Elena Volkov"],
      publicationYear: 2024,
      citations: 234,
    },
    {
      title: "Dark Matter Detection: New Experimental Approaches",
      content: generateLoremIpsum(4200),
      subject: "Physics",
      keywords: ["dark matter", "particle physics", "cosmology", "detection methods"],
      abstract: "This paper reviews novel experimental techniques for dark matter detection, including quantum sensors and underground laboratories.",
      authors: ["Dr. Maria Gonzalez", "Prof. David Kim"],
      publicationYear: 2023,
      citations: 178,
    },
    {
      title: "Quantum Computing: From Theory to Practical Applications",
      content: generateLoremIpsum(5500),
      subject: "Physics",
      keywords: ["quantum computing", "qubits", "quantum algorithms", "decoherence"],
      abstract: "We examine the transition from theoretical quantum computing concepts to practical implementations and current challenges.",
      authors: ["Prof. Robert Zhang", "Dr. Sophia Patel"],
      publicationYear: 2024,
      citations: 312,
    },
  ];

  const mathDocuments: DocumentTemplate[] = [
    {
      title: "Advanced Topics in Algebraic Topology: Homotopy Theory",
      content: generateLoremIpsum(4800),
      subject: "Mathematics",
      keywords: ["algebraic topology", "homotopy theory", "fundamental groups", "fiber bundles"],
      abstract: "This paper presents advanced concepts in algebraic topology, focusing on homotopy theory and its applications in modern mathematics.",
      authors: ["Prof. Alexander Petrov", "Dr. Emma Johnson"],
      publicationYear: 2023,
      citations: 67,
    },
    {
      title: "Stochastic Processes in Financial Mathematics",
      content: generateLoremIpsum(4200),
      subject: "Mathematics",
      keywords: ["stochastic processes", "financial mathematics", "brownian motion", "options pricing"],
      abstract: "We develop new stochastic models for financial derivatives pricing, incorporating jump processes and volatility clustering.",
      authors: ["Dr. Christopher Lee", "Prof. Natalie Brown"],
      publicationYear: 2024,
      citations: 156,
    },
    {
      title: "Machine Learning Applications in Number Theory",
      content: generateLoremIpsum(3900),
      subject: "Mathematics",
      keywords: ["number theory", "machine learning", "prime numbers", "elliptic curves"],
      abstract: "This paper explores how machine learning techniques can be applied to solve classical problems in number theory.",
      authors: ["Dr. Yuki Tanaka", "Prof. Marcus Weber"],
      publicationYear: 2023,
      citations: 98,
    },
    {
      title: "Differential Geometry and General Relativity",
      content: generateLoremIpsum(5200),
      subject: "Mathematics",
      keywords: ["differential geometry", "general relativity", "manifolds", "curvature"],
      abstract: "We present the mathematical foundations of general relativity through the lens of modern differential geometry.",
      authors: ["Prof. Isabella Martinez", "Dr. Thomas Anderson"],
      publicationYear: 2024,
      citations: 203,
    },
    {
      title: "Graph Theory Applications in Network Science",
      content: generateLoremIpsum(4100),
      subject: "Mathematics",
      keywords: ["graph theory", "network science", "algorithms", "complexity"],
      abstract: "This paper examines modern applications of graph theory in analyzing complex networks, from social media to biological systems.",
      authors: ["Dr. Rachel Green", "Prof. Kevin Liu"],
      publicationYear: 2023,
      citations: 187,
    },
  ];

  const csDocuments: DocumentTemplate[] = [
    {
      title: "Neural Architecture Search: Automated Deep Learning Design",
      content: generateLoremIpsum(5300),
      subject: "Computer Science",
      keywords: ["neural architecture search", "AutoML", "deep learning", "optimization"],
      abstract: "We present a comprehensive survey of neural architecture search methods and propose a new evolutionary approach for efficient architecture discovery.",
      authors: ["Dr. Jennifer Wu", "Prof. Samuel Jackson"],
      publicationYear: 2024,
      citations: 245,
    },
    {
      title: "Distributed Consensus in Blockchain Networks",
      content: generateLoremIpsum(4600),
      subject: "Computer Science",
      keywords: ["distributed systems", "consensus algorithms", "blockchain", "byzantine fault tolerance"],
      abstract: "This paper analyzes various consensus mechanisms in blockchain networks and proposes improvements for scalability and energy efficiency.",
      authors: ["Prof. Daniel Kim", "Dr. Olivia Taylor"],
      publicationYear: 2023,
      citations: 189,
    },
    {
      title: "Quantum Algorithms for Optimization Problems",
      content: generateLoremIpsum(4400),
      subject: "Computer Science",
      keywords: ["quantum algorithms", "optimization", "quantum computing", "complexity theory"],
      abstract: "We develop new quantum algorithms for solving NP-hard optimization problems with potential exponential speedups.",
      authors: ["Dr. Amit Sharma", "Prof. Catherine Moore"],
      publicationYear: 2024,
      citations: 167,
    },
    {
      title: "Privacy-Preserving Machine Learning Techniques",
      content: generateLoremIpsum(4900),
      subject: "Computer Science",
      keywords: ["privacy", "federated learning", "differential privacy", "secure computation"],
      abstract: "This paper presents novel approaches for training machine learning models while preserving user privacy and data confidentiality.",
      authors: ["Prof. Brian Wilson", "Dr. Michelle Chen"],
      publicationYear: 2023,
      citations: 298,
    },
    {
      title: "Natural Language Processing with Transformer Models",
      content: generateLoremIpsum(5100),
      subject: "Computer Science",
      keywords: ["NLP", "transformers", "attention mechanisms", "language models"],
      abstract: "We explore recent advances in transformer-based architectures for natural language understanding and generation tasks.",
      authors: ["Dr. Patrick O'Brien", "Prof. Linda Zhang"],
      publicationYear: 2024,
      citations: 412,
    },
  ];

  const biologyDocuments: DocumentTemplate[] = [
    {
      title: "CRISPR-Cas9: Precision Gene Editing in Human Cells",
      content: generateLoremIpsum(4700),
      subject: "Biology",
      keywords: ["CRISPR", "gene editing", "molecular biology", "genetic engineering"],
      abstract: "This paper reviews recent advances in CRISPR-Cas9 technology for precise genome editing in human cells and discusses ethical implications.",
      authors: ["Dr. Elizabeth Harper", "Prof. John Davis"],
      publicationYear: 2024,
      citations: 356,
    },
    {
      title: "Protein Folding Mechanisms: AI-Driven Predictions",
      content: generateLoremIpsum(4300),
      subject: "Biology",
      keywords: ["protein folding", "structural biology", "artificial intelligence", "molecular dynamics"],
      abstract: "We present new AI models for predicting protein structures from amino acid sequences with unprecedented accuracy.",
      authors: ["Prof. Susan Miller", "Dr. Richard Thompson"],
      publicationYear: 2023,
      citations: 278,
    },
    {
      title: "Microbiome Dynamics in Human Health",
      content: generateLoremIpsum(4500),
      subject: "Biology",
      keywords: ["microbiome", "gut bacteria", "health", "metagenomics"],
      abstract: "This comprehensive study examines the role of the human microbiome in health and disease, with implications for personalized medicine.",
      authors: ["Dr. Nancy Anderson", "Prof. Mark Robinson"],
      publicationYear: 2024,
      citations: 234,
    },
    {
      title: "Neuroplasticity and Learning: Molecular Mechanisms",
      content: generateLoremIpsum(4800),
      subject: "Biology",
      keywords: ["neuroplasticity", "neuroscience", "learning", "synaptic plasticity"],
      abstract: "We investigate the molecular basis of neuroplasticity and its role in learning and memory formation.",
      authors: ["Prof. Karen White", "Dr. Steven Lee"],
      publicationYear: 2023,
      citations: 198,
    },
    {
      title: "Climate Change Impact on Marine Ecosystems",
      content: generateLoremIpsum(4100),
      subject: "Biology",
      keywords: ["climate change", "marine biology", "ecosystems", "biodiversity"],
      abstract: "This paper analyzes the effects of global warming on marine ecosystems and proposes conservation strategies.",
      authors: ["Dr. Jessica Brown", "Prof. William Garcia"],
      publicationYear: 2024,
      citations: 267,
    },
  ];

  return [
    ...physicsDocuments,
    ...mathDocuments,
    ...csDocuments,
    ...biologyDocuments,
    // Add more documents to reach 50+
    ...generateAdditionalDocuments(30),
  ];
}

function generateAdditionalDocuments(count: number): DocumentTemplate[] {
  const subjects = ["Physics", "Mathematics", "Computer Science", "Biology"];
  const documents: DocumentTemplate[] = [];

  for (let i = 0; i < count; i++) {
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    documents.push({
      title: generateRandomTitle(subject),
      content: generateLoremIpsum(Math.floor(Math.random() * 2000) + 3000),
      subject,
      keywords: generateRandomKeywords(subject),
      abstract: generateRandomAbstract(subject),
      authors: generateRandomAuthors(),
      publicationYear: 2023 + Math.floor(Math.random() * 2),
      citations: Math.floor(Math.random() * 300) + 10,
    });
  }

  return documents;
}

async function createCitations(supabase: any, documents: any[]) {
  console.log('    Creating citation network...');
  
  // Create realistic citation patterns
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const numCitations = Math.floor(Math.random() * 5) + 1;
    
    for (let j = 0; j < numCitations; j++) {
      // Papers typically cite older papers
      const potentialCited = documents.filter((d, idx) => 
        idx !== i && d.subject === doc.subject && d.publication_year <= doc.publication_year
      );
      
      if (potentialCited.length > 0) {
        const cited = potentialCited[Math.floor(Math.random() * potentialCited.length)];
        
        await supabase.from('document_citations').insert({
          citing_document_id: doc.id,
          cited_document_id: cited.id,
          context: `As shown in ${cited.authors[0].split(' ').pop()} et al. (${cited.publication_year})...`,
        });
      }
    }
  }
}

// Helper functions
function generateLoremIpsum(words: number): string {
  const lorem = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ";
  let result = "";
  while (result.split(' ').length < words) {
    result += lorem;
  }
  return result.split(' ').slice(0, words).join(' ') + '.';
}

function getRandomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString();
}

function getRandomJournal(subject: string): string {
  const journals: { [key: string]: string[] } = {
    "Physics": ["Physical Review Letters", "Nature Physics", "Science", "Applied Physics Letters"],
    "Mathematics": ["Annals of Mathematics", "Journal of the AMS", "Inventiones Mathematicae"],
    "Computer Science": ["ACM Computing Surveys", "IEEE Computer", "Nature Machine Intelligence"],
    "Biology": ["Nature", "Science", "Cell", "PNAS"],
  };
  const subjectJournals = journals[subject] || journals["Physics"];
  return subjectJournals[Math.floor(Math.random() * subjectJournals.length)];
}

function getRandomConference(subject: string): string {
  const conferences: { [key: string]: string[] } = {
    "Computer Science": ["NeurIPS", "ICML", "CVPR", "ACL", "ICLR"],
    "Physics": ["APS March Meeting", "CERN Conference", "Quantum Information Processing"],
    "Mathematics": ["International Congress of Mathematicians", "Joint Mathematics Meetings"],
    "Biology": ["AACR Annual Meeting", "Society for Neuroscience", "EMBO Conference"],
  };
  const subjectConfs = conferences[subject] || [];
  return subjectConfs.length > 0 ? subjectConfs[Math.floor(Math.random() * subjectConfs.length)] : "";
}

function generateRandomTitle(subject: string): string {
  const prefixes = ["Advanced", "Novel", "Comprehensive", "Innovative", "Emerging"];
  const topics: { [key: string]: string[] } = {
    "Physics": ["Quantum Mechanics", "Particle Physics", "Condensed Matter", "Astrophysics"],
    "Mathematics": ["Number Theory", "Topology", "Analysis", "Algebra", "Geometry"],
    "Computer Science": ["Machine Learning", "Algorithms", "Distributed Systems", "Security"],
    "Biology": ["Genetics", "Cell Biology", "Ecology", "Biochemistry", "Evolution"],
  };
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const topic = topics[subject][Math.floor(Math.random() * topics[subject].length)];
  const suffix = ["Applications", "Theory", "Methods", "Perspectives", "Approaches"];
  
  return `${prefix} ${topic}: ${suffix[Math.floor(Math.random() * suffix.length)]}`;
}

function generateRandomKeywords(subject: string): string[] {
  const keywords: { [key: string]: string[] } = {
    "Physics": ["quantum", "particles", "energy", "forces", "relativity", "mechanics"],
    "Mathematics": ["theorem", "proof", "algebra", "calculus", "geometry", "analysis"],
    "Computer Science": ["algorithm", "data structure", "machine learning", "networks", "security"],
    "Biology": ["cells", "DNA", "proteins", "evolution", "genetics", "ecology"],
  };
  
  const subjectKeywords = keywords[subject];
  const selected: string[] = [];
  const count = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < count; i++) {
    const keyword = subjectKeywords[Math.floor(Math.random() * subjectKeywords.length)];
    if (!selected.includes(keyword)) {
      selected.push(keyword);
    }
  }
  
  return selected;
}

function generateRandomAbstract(subject: string): string {
  return `This paper investigates important aspects of ${subject.toLowerCase()} with a focus on recent developments and future directions. Our findings contribute to the understanding of fundamental principles in this field.`;
}

function generateRandomAuthors(): string[] {
  const firstNames = ["John", "Mary", "David", "Sarah", "Michael", "Jennifer", "Robert", "Lisa"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];
  const titles = ["Dr.", "Prof.", ""];
  
  const count = Math.floor(Math.random() * 3) + 1;
  const authors: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const title = titles[Math.floor(Math.random() * titles.length)];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    authors.push(`${title} ${firstName} ${lastName}`.trim());
  }
  
  return authors;
}

export async function cleanupDocuments(supabase: any) {
  await supabase.from('document_citations').delete().gte('created_at', '2020-01-01');
  await supabase.from('documents').delete().gte('created_at', '2020-01-01');
}