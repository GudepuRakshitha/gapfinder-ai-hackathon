import type { MaterialSourceType } from "@/backend/types";

export interface SampleDocument {
  name: string;
  sourceType: MaterialSourceType;
  content: string;
}

/**
 * A small, original sample study pack used to demonstrate the full pipeline
 * without pretending it is the student's own material. Every seeded material
 * is flagged with `isDemo: true` and labelled “Sample” in the UI.
 */
export const SAMPLE_PACK: SampleDocument[] = [
  {
    name: "Biology Syllabus — Cell Biology and Genetics.txt",
    sourceType: "syllabus",
    content: `BIOLOGY — GRADE 11 SYLLABUS

Unit 3: Cell Biology and Genetics

This unit introduces the structure and function of cells, how materials move across membranes, how enzymes control metabolism, and how genetic information is stored, copied and inherited.

1. Cell Structure and Organelles
- Plasma membrane and cell boundaries
- Cytoplasm and cytosol
- Nucleus, nucleolus and chromatin
- Mitochondria and ATP production
- Ribosomes, rough and smooth endoplasmic reticulum
- Golgi apparatus and lysosomes

2. Cell Membrane and Transport
- Phospholipid bilayer and membrane proteins
- Diffusion and facilitated diffusion
- Osmosis and water potential
- Active transport and the sodium-potassium pump
- Endocytosis and exocytosis

3. Enzymes and Metabolism
- Enzyme structure and active sites
- Lock-and-key and induced-fit models
- Factors affecting enzyme activity
- Competitive and non-competitive inhibition
- Metabolic pathways and activation energy

4. Cellular Respiration
- Glycolysis and the cytosol
- Link reaction and the Krebs cycle
- Oxidative phosphorylation and the electron transport chain
- Anaerobic respiration and fermentation
- ATP yield and respiratory substrates

5. Photosynthesis
- Chloroplast structure and pigments
- Light-dependent reactions
- Light-independent reactions and the Calvin cycle
- Limiting factors and the rate of photosynthesis

6. DNA Replication
- DNA structure and complementary base pairing
- Semi-conservative replication
- DNA polymerase and helicase
- Leading and lagging strands
- Proofreading and mutation

7. Mitosis and Meiosis
- The cell cycle and interphase
- Stages of mitosis
- Meiosis I and crossing over
- Meiosis II and genetic variation
- Cancer and uncontrolled cell division

8. Genetics and Inheritance
- Genotype, phenotype and alleles
- Monohybrid and dihybrid crosses
- Punnett squares and probability
- Codominance and incomplete dominance
- Sex-linked inheritance and pedigree analysis

Assessment: One written paper (90 minutes), consisting of short-answer questions and one extended response.`,
  },
  {
    name: "Biology Study Notes — Cell Biology and Genetics.txt",
    sourceType: "notes",
    content: `BIOLOGY STUDY NOTES — CELL BIOLOGY AND GENETICS

Cell Structure and Organelles

Cells are the basic structural and functional units of living organisms. The plasma membrane separates the cytoplasm from the external environment and controls which substances enter or leave the cell. The cytoplasm contains the cytosol and the organelles suspended within it.

The nucleus stores most of the cell's genetic material as chromatin and coordinates activities such as growth, protein synthesis and cell division. The nucleolus inside the nucleus produces ribosomes. Mitochondria are double-membraned organelles where aerobic respiration takes place; they generate most of the cell's ATP. Ribosomes are the sites of protein synthesis and may be free in the cytoplasm or attached to the rough endoplasmic reticulum. The smooth endoplasmic reticulum synthesises lipids, while the Golgi apparatus modifies, packages and transports proteins. Lysosomes contain hydrolytic enzymes that digest waste materials and worn-out organelles.

Cell Membrane and Transport

The cell membrane is a phospholipid bilayer with embedded proteins, often described as a fluid mosaic model. Small non-polar molecules can diffuse directly through the bilayer, while ions and large polar molecules require channel or carrier proteins. Facilitated diffusion is passive and follows a concentration gradient.

Osmosis is the movement of water from a region of higher water potential to a region of lower water potential through a partially permeable membrane. Active transport moves substances against a concentration gradient and requires energy from ATP. The sodium-potassium pump is an example of active transport: it moves three sodium ions out of the cell and two potassium ions into the cell, helping to maintain resting potential. Endocytosis brings large particles into the cell by forming a vesicle, and exocytosis releases materials by fusing a vesicle with the membrane.

Enzymes and Metabolism

Enzymes are biological catalysts that lower the activation energy of a reaction without being consumed. They are proteins with a specific active site that binds to a complementary substrate. The lock-and-key model describes a rigid fit, while the induced-fit model suggests that the active site changes shape slightly when the substrate binds.

Enzyme activity is affected by temperature, pH, substrate concentration and inhibitors. Above the optimum temperature, enzymes denature because hydrogen bonds break and the active site loses its shape. Competitive inhibitors bind to the active site, whereas non-competitive inhibitors bind elsewhere and change the shape of the active site. Metabolism is the sum of all enzyme-controlled reactions in a cell.

Cellular Respiration

Cellular respiration releases energy from organic molecules and stores it as ATP. Glycolysis occurs in the cytosol and breaks one glucose molecule into two pyruvate molecules, producing a small net gain of ATP and reduced NAD. The link reaction converts pyruvate into acetyl coenzyme A, which enters the Krebs cycle in the mitochondrial matrix.

The Krebs cycle produces reduced NAD, reduced FAD and ATP, and releases carbon dioxide. Oxidative phosphorylation occurs on the inner mitochondrial membrane, where electrons pass along the electron transport chain and energy is used to pump protons. ATP synthase then produces ATP as protons flow back through the membrane. Anaerobic respiration occurs without oxygen and produces lactate in animal cells or ethanol and carbon dioxide in yeast.

Photosynthesis

Photosynthesis converts light energy into chemical energy stored in glucose. It takes place in chloroplasts. Chlorophyll absorbs mainly red and blue light and reflects green light. The light-dependent reactions occur on the thylakoid membranes and produce ATP, reduced NADP and oxygen from the splitting of water.

The light-independent reactions, also called the Calvin cycle, occur in the stroma. Carbon dioxide is fixed onto ribulose bisphosphate by the enzyme rubisco, and the resulting intermediates are reduced using ATP and reduced NADP to form triose phosphate. Triose phosphate is used to synthesise glucose and regenerate ribulose bisphosphate. Light intensity, carbon dioxide concentration and temperature can limit the rate of photosynthesis.

DNA Replication

DNA is a double helix of two polynucleotide strands held together by hydrogen bonds between complementary bases: adenine pairs with thymine, and cytosine pairs with guanine. Replication is semi-conservative because each new DNA molecule contains one original strand and one new strand.

Helicase unwinds the double helix and breaks the hydrogen bonds. DNA polymerase adds free nucleotides to the exposed bases in a complementary sequence and catalyses the formation of phosphodiester bonds. The leading strand is synthesised continuously, while the lagging strand is synthesised in short Okazaki fragments that are later joined by ligase. Proofreading by DNA polymerase reduces the rate of mutation, although errors can still occur.

Mitosis and Meiosis

The cell cycle consists of interphase and nuclear division followed by cytokinesis. Interphase includes growth, DNA replication and preparation for division. Mitosis produces two genetically identical diploid cells and is important for growth, repair and asexual reproduction.

The stages of mitosis are prophase, metaphase, anaphase and telophase. Chromosomes condense in prophase, align at the equator in metaphase, are pulled to opposite poles in anaphase and decondense in telophase. Meiosis produces four genetically different haploid cells. Crossing over in prophase I and independent assortment in metaphase I create genetic variation. Meiosis II separates sister chromatids. Uncontrolled mitosis can lead to cancer.

Genetics and Inheritance

A gene is a sequence of DNA that codes for a polypeptide or functional RNA. Alleles are different versions of a gene. Genotype describes the combination of alleles, while phenotype describes the observable characteristics produced by the genotype and the environment.

A monohybrid cross follows one gene, whereas a dihybrid cross follows two genes. Punnett squares use probability to predict the expected ratios of offspring. In codominance, both alleles are expressed, while incomplete dominance produces an intermediate phenotype. Sex-linked genes are located on sex chromosomes, and pedigree analysis can reveal the pattern of inheritance across generations.`,
  },
  {
    name: "Biology Past Paper — Midterm 2025.txt",
    sourceType: "past_paper",
    content: `BIOLOGY — MIDTERM EXAMINATION 2025

Time allowed: 90 minutes
Total marks: 60

SECTION A — SHORT ANSWER

1. Describe the structure and function of mitochondria in eukaryotic cells. (4 marks)
2. Explain why the sodium-potassium pump requires ATP and state its role in the cell membrane. (4 marks)
3. Define activation energy and explain how enzymes reduce it. (3 marks)
4. Compare competitive and non-competitive enzyme inhibitors. (4 marks)
5. Outline the main stages of glycolysis and state where it occurs. (4 marks)
6. Explain how the electron transport chain produces ATP in aerobic respiration. (5 marks)
7. Describe the role of chlorophyll in the light-dependent reactions of photosynthesis. (4 marks)
8. Explain how carbon dioxide is fixed in the Calvin cycle. (4 marks)
9. Describe semi-conservative DNA replication and the role of DNA polymerase. (5 marks)
10. Explain how crossing over during meiosis increases genetic variation. (4 marks)
11. Distinguish between genotype and phenotype using a monohybrid cross. (5 marks)
12. A heterozygous tall pea plant is crossed with a short pea plant. Use a Punnett square to predict the phenotype ratio of the offspring. (6 marks)

SECTION B — EXTENDED RESPONSE

13. Discuss how the structure of the cell membrane allows both passive and active transport. Use named examples in your answer. (8 marks)
14. Explain how light intensity, carbon dioxide concentration and temperature can limit the rate of photosynthesis. (8 marks)`,
  },
];
