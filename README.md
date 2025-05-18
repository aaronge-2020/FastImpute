# [FastImpute: A Baseline for Open-source, Reference-Free Genotype Imputation Methods](https://aaronge-2020.github.io/DeepImpute/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- Add other badges like build status, etc., if applicable -->

This repository contains the code and resources for the FastImpute project, a lightweight, client-side genotype imputation pipeline. As a case study, we demonstrate its application in calculating the PRS313 Polygenic Risk Score for breast cancer risk prediction from direct-to-consumer (DTC) genotyping data.

Based on the work described in the paper:
**FastImpute: A Baseline for Open-source, Reference-Free Genotype Imputation Methods - A Case Study in Breast Cancer (PRS313)**
Aaron Ge<sup>1,2</sup>, Jeya Balasubramanian<sup>1</sup>, Xueyao Wu<sup>1</sup>, Peter Kraft<sup>1</sup>, Jonas S. Almeida<sup>1</sup>

<sup>1</sup> Division of Cancer Epidemiology and Genetics, National Cancer Institute, National Institutes of Health, Maryland, USA
<sup>2</sup> University of Maryland School of Medicine, Baltimore, Maryland, USA

## Table of Contents

1.  [Introduction](#introduction)
2.  [Features](#features)
3.  [Case Study: PRS313_BC & 23andMe V5](#case-study-prs313_bc--23andme-v5)
4.  [The FastImpute Pipeline](#the-fastimpute-pipeline)
5.  [Model Training & Evaluation](#model-training--evaluation)
6.  [Web Application (Client-Side Deployment)](#web-application-client-side-deployment)
7.  [Performance & Results Highlights](#performance--results-highlights)
8.  [Getting Started](#getting-started)
    *   [Repository Structure](#repository-structure)
    *   [Running the Pipeline (For Developers/Researchers)](#running-the-pipeline-for-developersresearchers)
    *   [Using the Web Application (For Users)](#using-the-web-application-for-users)
9.  [Limitations and Future Directions](#limitations-and-future-directions)
10. [Funding](#funding)
11. [References](#references)
12. [License](#license)

## Introduction

Genotype imputation is a crucial step in genetic analysis, enabling the prediction of missing genetic variants (SNPs) based on observed data and reference panels. However, traditional methods often require sharing sensitive individual-level data with external servers or downloading massive reference genomes, raising privacy concerns and limiting accessibility.

While recent deep learning-based methods offer a "reference-free" alternative (using pre-trained models), they often result in large, complex models unsuitable for deployment on client-side devices like personal computers or smartphones.

FastImpute is proposed as a minimal baseline pipeline addressing these challenges. It focuses on creating lightweight models suitable for efficient, privacy-preserving imputation directly within a user's web browser or on edge devices. By keeping data processing local, FastImpute significantly enhances data privacy and democratizes access to personalized genetic risk information from platforms like direct-to-consumer (DTC) testing.

## Features

*   **Reference-Free Imputation:** Uses pre-trained models, eliminating the need for users to download large reference panels or upload data to external servers for imputation.
*   **Client-Side Deployment:** Designed for execution directly within the user's browser or on edge devices using web technologies.
*   **Privacy-Preserving:** Individual genetic data is processed locally and never leaves the user's device.
*   **Lightweight Models:** Utilizes simple, efficient models (linear and logistic regression) as a baseline, minimizing computational overhead.
*   **Open-Source:** The code and pipeline are freely available and modifiable.
*   **Versatile Pipeline:** The underlying pipeline can be adapted to train models for different genomic regions and genotyping platforms.
*   **Fast Execution:** Enables near real-time imputation and analysis (e.g., PRS calculation).

## Case Study: PRS313_BC & 23andMe V5

To demonstrate the FastImpute pipeline, we applied it to calculate the PRS313 Polygenic Risk Score (PRS000004) for breast cancer risk prediction. PRS313 comprises 313 SNPs, many of which are not typically genotyped on common platforms like the 23andMe V5 chip.

We simulated genotyping array data similar to 23andMe V5 by downsampling whole-genome sequencing data from the 1000 Genomes Project. FastImpute was used to impute the missing PRS313 SNPs from the simulated 23andMe V5 data, allowing for calculation of the full PRS313 score.

## The FastImpute Pipeline

The FastImpute pipeline is designed to train models for client-side imputation and consists of four main steps:

1.  **Gather Whole Genome Sequencing (WGS) data:** Obtain a suitable reference dataset (e.g., 1000 Genomes Project).
2.  **Subset Panel SNPs:** Filter the WGS data to include only SNPs present on the target genotyping platform (e.g., 23andMe V5) and the target SNPs for imputation (e.g., PRS313 SNPs). This creates the "raw input" and "target" data for training.
3.  **Identify LD-based Input SNPs:** Use tools like LDlink to find a subset of the panel SNPs that are in linkage disequilibrium (LD) with the target SNPs. These LD-linked SNPs serve as the features (input) for the prediction models.
4.  **Train the Model:** Train a model (e.g., linear or logistic regression) using the LD-linked input SNPs to predict the target SNPs. Models are trained per chromosome.

A conceptual illustration of the pipeline (similar to Figure 1 in the paper) would be helpful here.

## Model Training & Evaluation

We implemented the FastImpute pipeline to train linear regression (unphased data) and logistic regression (phased data) models. These models were trained separately for each chromosome (excluding X and Y) to predict the dosage of PRS313 SNPs using LD-linked 23andMe V5 SNPs as features.

Training utilized an 80/20 split of 1000 Genomes data, with PyTorch for implementation and Optuna for hyperparameter tuning with L1 regularization.

Model performance was evaluated at both the SNP level (using R², IQS, Accuracy, AUC) and the PRS level (using R² between imputed PRS and true PRS from WGS data, and confusion matrices for risk quantile prediction). Performance was benchmarked against Beagle 5.4 and simple imputation methods (No Imputation, MAF imputation).

## Web Application (Client-Side Deployment)

The trained linear regression model (which works with unphased data typical of DTC files) has been deployed as a web application, allowing users to calculate their PRS313_BC scores privately and efficiently in their browser.

**Web Application:** [https://aaronge-2020.github.io/DeepImpute/](https://aaronge-2020.github.io/DeepImpute/)

The web application allows users to upload their 23andMe data file. It handles missing SNPs on the user's chip via MAF-based simulations, imputes the required PRS313 SNPs using the FastImpute model, calculates the PRS for different breast cancer phenotypes across multiple simulations, and displays statistical summaries and distributions of the scores. This process is completed rapidly, typically within seconds for 1,000 simulations.

A screenshot of the web application interface (similar to Figure 3 in the paper) would be beneficial here.

## Performance & Results Highlights

The FastImpute models demonstrate promising performance, particularly in the context of their lightweight and client-side deployment.

*   **SNP Imputation:** While Beagle generally achieves the highest SNP-level R², the FastImpute linear and logistic regression models show comparable performance on other metrics like IQS, Accuracy, and AUC (refer to Figure 4 in the paper).
*   **PRS Accuracy:** PRS scores calculated using FastImpute imputed data show a substantial correlation (R²=0.86 for overall breast cancer with logistic regression) with PRS scores from true WGS data. This is a significant improvement over calculating PRS with only genotyped SNPs (R²=0.33) or imputing missing SNPs by MAF (R²=0.28) (refer to Figure 6 in the paper).
*   **High-Risk Prediction:** FastImpute models perform comparably to Beagle in identifying individuals in the highest PRS quantiles, which are clinically relevant for risk stratification (refer to Figure 7 in the paper).

These results highlight that simple, lightweight models trained via the FastImpute pipeline can provide imputation accurate enough for practical PRS calculations on client-side devices.

## Getting Started

### Using the Web Application (For Users)

The easiest way to use FastImpute for PRS calculation is through the deployed web application:

1.  Go to the web application URL: [https://aaronge-2020.github.io/DeepImpute/](https://aaronge-2020.github.io/DeepImpute/)
2.  Follow the instructions on the page to upload your 23andMe genotype data file.
3.  The application will process your data locally in your browser and display your PRS313_BC scores for different breast cancer phenotypes.

## Limitations and Future Directions

We acknowledge the current limitations of this baseline implementation:

*   The 23andMe V5 panel reconstruction relies on a sample from OpenSNP, which might not perfectly capture all variations across V5 chips.
*   Feature selection used a fixed +/- 500KB window and R² > 0.01 threshold, which might not be optimal or capture all relevant LD information, especially for different ancestries.
*   The current web application does not calibrate PRS scores based on the user's specific superpopulation.

Future work aims to address these limitations:

*   Incorporate more diverse genotyping chips and genomic regions.
*   Develop and train superpopulation-specific imputation models for improved accuracy.
*   Explore more sophisticated, yet still lightweight, model architectures while maintaining client-side feasibility.
*   Refine feature selection methods.

## Funding

This work was funded by the National Cancer Institute (NCI) Intramural Research Program (DCEG/Episphere #10901).

## References

*   23andMe. (n.d.). DNA Genetic Testing For Health, Ancestry And More—23andMe. Retrieved July 16, 2024, from https://www.23andme.com/
*   1000 Genomes Project Consortium, Auton, A., Brooks, L. D., Durbin, R. M., Garrison, E. P., Kang, H. M., Korbel, J. O., Marchini, J. L., McCarthy, S., McVean, G. A., & Abecasis, G. R. (2015). A global reference for human genetic variation. *Nature*, *526*(7571), 68–74. https://doi.org/10.1038/nature15393
*   Akiba, T., Sano, S., Yanase, T., Ohta, T., & Koyama, M. (2019). Optuna: A Next-generation Hyperparameter Optimization Framework. *Proceedings of the 25th ACM SIGKDD International Conference on Knowledge Discovery & Data Mining*, 2623–2631. https://doi.org/10.1145/3292500.3330701
*   Balasubramanian, J. B., Choudhury, P. P., Mukhopadhyay, S., Ahearn, T., Chatterjee, N., García-Closas, M., & Almeida, J. S. (2024). Wasm-iCARE: A portable and privacy-preserving web module to build, validate, and apply absolute risk models. *JAMIA Open*, *7*(2), ooae055. https://doi.org/10.1093/jamiaopen/ooae055
*   Browning, B. L., Tian, X., Zhou, Y., & Browning, S. R. (2021). Fast two-stage phasing of large-scale sequence data. *The American Journal of Human Genetics*, *108*(10), 1880–1890. https://doi.org/10.1016/j.ajhg.2021.08.005 (Beagle 5.4)
*   Browning, S. R., & Browning, B. L. (2007). Rapid and Accurate Haplotype Phasing and Missing-Data Inference for Whole-Genome Association Studies By Use of Localized Haplotype Clustering. *American Journal of Human Genetics*, *81*(5), 1084–1097.
*   Chi Duong, V., Minh Vu, G., Khac Nguyen, T., Tran The Nguyen, H., Luong Pham, T., S. Vo, N., & Hong Hoang, T. (2023). A rapid and reference-free imputation method for low-cost genotyping platforms. *Scientific Reports*, *13*(1), 23083. https://doi.org/10.1038/s41598-023-50086-4
*   Das, S., Abecasis, G. R., & Browning, B. L. (2018). Genotype Imputation from Large Reference Panels. *Annual Review of Genomics and Human Genetics*, *19*(1), 73–96. https://doi.org/10.1146/annurev-genom-083117-021602
*   Das, S., Forer, L., Schönherr, S., Sidore, C., Locke, A. E., Kwong, A., Vrieze, S. I., Chew, E. Y., Levy, S., McGue, M., Schlessinger, D., Stambolian, D., Loh, P.-R., Iacono, W. G., Swaroop, A., Scott, L. J., Cucca, F., Kronenberg, F., Boehnke, M., … Fuchsberger, C. (2016). Next-generation genotype imputation service and methods. *Nature Genetics*, *48*(10), 1284–1287. https://doi.org/10.1038/ng.3656 (Michigan Imputation Server)
*   García-Closas, M., Ahearn, T. U., Gaudet, M. M., Hurson, A. N., Balasubramanian, J. B., Choudhury, P. P., Gerlanc, N. M., Patel, B., Russ, D., Abubakar, M., Freedman, N. D., Wong, W. S. W., Chanock, S. J., Berrington de Gonzalez, A., & Almeida, J. S. (2023). Moving Toward Findable, Accessible, Interoperable, Reusable Practices in Epidemiologic Research. *American Journal of Epidemiology*, *192*(6), 995–1005. https://doi.org/10.1093/aje/kwad040 (FAIR)
*   Goh, H.-A., Ho, C.-K., & Abas, F. S. (2023). Front-end deep learning web apps development and deployment: A review. *Applied Intelligence (Dordrecht, Netherlands)*, *53*(12), 15923–15945. https://doi.org/10.1007/s10489-022-04278-6
*   Greshake, B., Bayer, P. E., Rausch, H., & Reda, J. (2014). openSNP–A Crowdsourced Web Resource for Personal Genomics. *PLoS ONE*, *9*(3), e89204. https://doi.org/10.1371/journal.pone.0089204 (OpenSNP)
*   Howie, B. N., Donnelly, P., & Marchini, J. (2009). A Flexible and Accurate Genotype Imputation Method for the Next Generation of Genome-Wide Association Studies. *PLOS Genetics*, *5*(6), e1000529. https://doi.org/10.1371/journal.pgen.1000529
*   Kojima, K., Tadaka, S., Katsuoka, F., Tamiya, G., Yamamoto, M., & Kinoshita, K. (2020). A genotype imputation method for de-identified haplotype reference information by using recurrent neural network. *PLOS Computational Biology*, *16*(10), e1008207. https://doi.org/10.1371/journal.pcbi.1008207
*   Levi, H., Elkon, R., & Shamir, R. (2024). The predictive capacity of polygenic risk scores for disease risk is only moderately influenced by imputation panels tailored to the target population. *Bioinformatics*, *40*(2), btae036. https://doi.org/10.1093/bioinformatics/btae036
*   Li, H. (2011). A statistical framework for SNP calling, mutation discovery, association mapping and population genetical parameter estimation from sequencing data. *Bioinformatics*, *27*(21), 2987–2993. https://doi.org/10.1093/bioinformatics/btr509
*   Lin, P., Hartz, S. M., Zhang, Z., Saccone, S. F., Wang, J., Tischfield, J. A., Edenberg, H. J., Kramer, J. R., M.Goate, A., Bierut, L. J., Rice, J. P., & for the COGA Collaborators COGEND Collaborators, G. (2010). A New Statistic to Evaluate Imputation Reliability. *PLOS ONE*, *5*(3), e9697. https://doi.org/10.1371/journal.pone.0009697 (IQS)
*   Machiela, M. J., & Chanock, S. J. (2015). LDlink: A web-based application for exploring population-specific haplotype structure and linking correlated alleles of possible functional variants. *Bioinformatics*, *31*(21), 3555–3557. https://doi.org/10.1093/bioinformatics/btv402 (LDlink)
*   Mavaddat, N., Michailidou, K., Dennis, J., Lush, M., Fachal, L., Lee, A., Tyrer, J. P., Chen, T.-H., Wang, Q., Bolla, M. K., Yang, X., Adank, M. A., Ahearn, T., Aittomäki, K., Allen, J., Andrulis, I. L., Anton-Culver, H., Antonenkova, N. N., Arndt, V., … Easton, D. F. (2019). Polygenic Risk Scores for Prediction of Breast Cancer and Breast Cancer Subtypes. *American Journal of Human Genetics*, *104*(1), 21–34. https://doi.org/10.1016/j.ajhg.2018.11.002 (PRS313_BC)
*   Mowlaei, M. E., Li, C., Chen, J., Jamialahmadi, B., Kumar, S., Rebbeck, T. R., & Shi, X. (2023). Split-Transformer Impute (STI): Genotype Imputation Using a Transformer-Based Model (p. 2023.03.05.531190). *bioRxiv*. https://doi.org/10.1101/2023.03.05.531190
*   Naito, T., & Okada, Y. (2024). Genotype imputation methods for whole and complex genomic regions utilizing deep learning technology. *Journal of Human Genetics*, 1–6. https://doi.org/10.1038/s10038-023-01213-6
*   Naito, T., Suzuki, K., Hirata, J., Kamatani, Y., Matsuda, K., Toda, T., & Okada, Y. (2021). A deep learning method for HLA imputation and trans-ethnic MHC fine-mapping of type 1 diabetes. *Nature Communications*, *12*(1), 1639. https://doi.org/10.1038/s41467-021-21975-x
*   Paszke, A., Gross, S., Massa, F., Lerer, A., Bradbury, J., Chanan, G., Killeen, T., Lin, Z., Gimelshein, N., Antiga, L., Desmaison, A., Köpf, A., Yang, E., DeVito, Z., Raison, M., Tejani, A., Chilamkurthy, S., Steiner, B., Fang, L., … Chintala, S. (2019). PyTorch: An imperative style, high-performance deep learning library. In *Proceedings of the 33rd International Conference on Neural Information Processing Systems* (pp. 8026–8037). Curran Associates Inc.
*   Pedregosa, F., Varoquaux, G., Gramfort, A., Michel, V., Thirion, B., Grisel, O., Blondel, M., Müller, A., Nothman, J., Louppe, G., Prettenhofer, P., Weiss, R., Dubourg, V., Vanderplas, J., Passos, A., Cournapeau, D., Brucher, M., Perrot, M., & Duchesnay, É. (2018). Scikit-learn: Machine Learning in Python (arXiv:1201.0490). *arXiv*. https://doi.org/10.48550/arXiv.1201.0490
*   Perkel, J. M. (2024). No installation required: How WebAssembly is changing scientific computing. *Nature*, *627*(8003), 455–456. https://doi.org/10.1038/d41586-024-00725-1 (WebAssembly)
*   Purcell, S., Neale, B., Todd-Brown, K., Thomas, L., Ferreira, M. A. R., Bender, D., Maller, J., Sklar, P., de Bakker, P. I. W., Daly, M. J., & Sham, P. C. (2007). PLINK: A Tool Set for Whole-Genome Association and Population-Based Linkage Analyses. *American Journal of Human Genetics*, *81*(3), 559–575.
*   Sandoval, L., Jafri, S., Balasubramanian, J. B., Bhawsar, P., Edelson, J. L., Martins, Y., Maass, W., Chanock, S. J., Garcia-Closas, M., & Almeida, J. S. (2023). PRScalc, a privacy-preserving calculation of raw polygenic risk scores from direct-to-consumer genomics data. *Bioinformatics Advances*, *3*(1), vbad145. https://doi.org/10.1093/bioadv/vbad145
*   Tanaka, K., Kato, K., Nonaka, N., & Seita, J. (2022). Efficient HLA imputation from sequential SNPs data by Transformer (arXiv:2211.06430). *arXiv*. https://doi.org/10.48550/arXiv.2211.06430
*   Tibshirani, R. (1996). Regression Shrinkage and Selection via the Lasso. *Journal of the Royal Statistical Society. Series B (Methodological)*, *58*(1), 267–288. (Lasso/L1 Reg)
*   Wilkinson, M. D., Dumontier, M., Aalbersberg, Ij. J., Appleton, G., Axton, M., Baak, A., Blomberg, N., Boiten, J.-W., da Silva Santos, L. B., Bourne, P. E., Bouwman, J., Brookes, A. J., Clark, T., Crosas, M., Dillo, I., Dumon, O., Edmunds, S., Evelo, C. T., Finkers, R., … Mons, B. (2016). The FAIR Guiding Principles for scientific data management and stewardship. *Scientific Data*, *3*(1), 160018. https://doi.org/10.1038/sdata.2016.18

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
