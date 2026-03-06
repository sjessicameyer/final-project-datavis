// You can make these for free and delete them whenever so leaving it on the internet does not affect me
const api_key = 'a847d03e9bd2468aa977b6b6a984079c9c08';

async function getFishSVG(sciName, taxonomy) {
	const phylopic_url = 'https://api.phylopic.org';
	const search_phylopic_tag = '/images?build=536&filter_name=';
	const species = sciName.toLowerCase().replace(' ', '%20');

	if (taxonomy == 'X' || sciName == 'Chrysogorgia' || sciName == 'Thouarella') {
		return fishExceptions(sciName);
	}

	// Check for valid taxon magnitude search
	return axios.get(phylopic_url+search_phylopic_tag+species).then(res => { // Search by species
		if (res.data.totalItems == 0) {
			return axios.get(phylopic_url+search_phylopic_tag+taxonomy.family.name.toLowerCase()).then((res) => { // Search by family
				if (res.data.totalItems == 0) {
					return axios.get(phylopic_url+search_phylopic_tag+taxonomy.order.name.toLowerCase()).then((res) => { // Search by order
						if (res.data.totalItems == 0) {
							return axios.get(phylopic_url+search_phylopic_tag+taxonomy.class.name.toLowerCase()).then((res) => { // Search by class
								if (res.data.totalItems == 0) {
									return axios.get(phylopic_url+search_phylopic_tag+taxonomy.phylum.name.toLowerCase()).then((res) => { // Search by phylum
										return res.data.totalItems == 0 ? 'X' : res.data._links.firstPage.href;
									});
								}
								else {
									return res.data._links.firstPage.href;
								}
							});
						}
						else {
							return res.data._links.firstPage.href;
						}
					});
				}
				else {
					return res.data._links.firstPage.href;
				}
			});
		}
		else {
			return res.data._links.firstPage.href;
		}
	}).then(page => {
		if (page == 'X') { return page; } // If no possible images

		return axios.get(phylopic_url+page).then(res => { // Get list of image reference links
			return res.data._links.items[0].href;
		}).then(imgLink => {
			return axios.get(phylopic_url+imgLink).then(res => { // Get image information and url
				return res.data._links.vectorFile.href;
			});
		});
	});
}

async function getClassificationInformation(community) {
	const search_NCBI_url = `https://api.ncbi.nlm.nih.gov/datasets/v2/taxonomy/dataset_report`;
	const NCBI_body = {'taxons': community.map(d => d.species)};
	const NCBI_header = {headers: {'api-key': api_key}};

	return axios.post(search_NCBI_url, NCBI_body, NCBI_header).then((res) => { // Search NCBI for more info
		let reports = res.data.reports;

		let classifications = [];
		for (let i = 0; i < community.length; i++) {
			let found = false;
			for (let j = 0; j < reports.length; j++) {
				if (community[i].species === reports[j].query[0]) {
					try {
						classifications.push(reports[j].taxonomy.classification);
					}
					catch(e) {
						classifications.push('X');
					}
					found = true;
					break;
				}
			}
			if (!found) classifications.push('X');
		}

		return classifications;
	});
}

function fishExceptions(species) {
	switch (species) {
		// Default algorithm picks ugly SVG
		case 'Chrysogorgia':
		case 'Thouarella':
			return 'https://images.phylopic.org/images/c219e634-002e-4da0-af23-f0ef916db93e/vector.svg';
		// Species / genus don't exist in NCBI database
		case "Pterosperma marginatum":
		case "Pterosperma vanhoeffenii":
		case "Pterosperma moebii":
			return 'https://images.phylopic.org/images/86a33ef6-914f-4eeb-ae61-216b8fc272ff/vector.svg';
		case "Luzonichthys whitleyi":
			return 'https://images.phylopic.org/images/8de62bb0-f35b-45d3-a721-6ff10b60f672/vector.svg';
		case "Swiftia torreyi":
			return 'https://images.phylopic.org/images/baf5b9c0-79f9-4edb-b2e4-e45e45a3b2ed/vector.svg';
		case "Acantholaimus veitkoehlerae":
		case "Acantholaimus maks":
			return 'https://images.phylopic.org/images/a68be31e-95e7-415a-8fb2-2a6fd3275cb8/vector.svg';
		case "Nematocarcinus sigmoideus":
			return 'https://images.phylopic.org/images/afbc3136-8e5d-4417-a8b1-b7e50c09d56b/vector.svg';
		case "Amphiophiura convexa":
			return 'https://images.phylopic.org/images/99c957a2-99b1-4a30-9b25-355a6fb55509/vector.svg';
		case "Stephanoscyphistoma":
			return 'https://images.phylopic.org/images/4aa4eb35-fd31-458c-b262-606dfbdbd19e/vector.svg';
		case "Axinodon bornianus":
			return 'https://images.phylopic.org/images/9f6baa5c-7d56-46fd-b4d8-2de349898af0/vector.svg';
		case "Propeamussium meridionale":
			return 'http://images.phylopic.org/images/fccce2ac-5d0b-45b8-afbf-7ca43447f7ae/vector.svg';
		default:
			return 'https://logo-icons.com/cdn/shop/files/125-logo-1711890864.887.svg';
	}
}

async function getCommonNames(community) {
	const search_NCBI_url = `https://api.ncbi.nlm.nih.gov/datasets/v2/taxonomy/dataset_report`;
	const NCBI_body = {'taxons': community.map(d => d.species)};
	const NCBI_header = {headers: {'api-key': api_key}};

	return axios.post(search_NCBI_url, NCBI_body, NCBI_header).then((res) => { // Search NCBI for more info
		let reports = res.data.reports;

		let classifications = [];
		for (let i = 0; i < community.length; i++) {
			for (let j = 0; j < reports.length; j++) {
				if (community[i].species === reports[j].query[0]) {
					if (reports[j].taxonomy && reports[j].taxonomy.curator_common_name !== undefined) {
						classifications.push(titleCase(reports[j].taxonomy.curator_common_name));
					}
					else if (reports[j].taxonomy && reports[j].taxonomy.group_name !== undefined) {
						console.log(reports[j].taxonomy)
						classifications.push(titleCase(reports[j].taxonomy.group_name));
					}
					else {
						classifications.push(fishCommonNameExceptions(reports[j].query[0]));
					}
					break;
				}
			}
		}

		return classifications;
	});
}

function fishCommonNameExceptions(species) {
	switch (species) {
		// Default algorithm picks ugly SVG
		case 'Chrysogorgia':
			return 'Soft Coral';
		case 'Thouarella':
			return 'Soft Coral';
		// Species / genus don't exist in NCBI database
		case "Pterosperma marginatum":
		case "Pterosperma vanhoeffenii":
		case "Pterosperma moebii":
			return 'Green Algae';
		case "Luzonichthys whitleyi":
			return 'Whitley\'s Splitfin';
		case "Swiftia torreyi":
			return 'Dwarf Red Sea Fan';
		case "Acantholaimus veitkoehlerae":
		case "Acantholaimus maks":
			return 'Marine Nematode';
		case "Nematocarcinus sigmoideus":
			return 'Crustacean';
		case "Amphiophiura convexa":
			return 'Brittle Star';
		case "Stephanoscyphistoma":
			return 'Crown Jellyfish';
		case "Axinodon bornianus":
			return 'Bivalve';
		case "Propeamussium meridionale":
			return 'Bivalve';
		default:
			return 'Marine Organism';
	}
}

function titleCase(str) {
	return str.toLowerCase().split(' ').map(function (word) {
		return (word.charAt(0).toUpperCase() + word.slice(1, (word.charAt(word.length-1) == 's' ? (word == 'fishes' ? word.length-2 : word.length-1) : word.length)));
	}).join(' ');
}
