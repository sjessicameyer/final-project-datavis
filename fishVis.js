// You can make these for free and delete them whenever so leaving it on the internet does not affect me
const api_key = 'a847d03e9bd2468aa977b6b6a984079c9c08';

async function getFishSVG(sciName) {
	const phylopic_url = 'https://api.phylopic.org';
	const search_phylopic_tag = '/images?build=536&filter_name=';
	const species = sciName.toLowerCase().replace(' ', '%20');
	const genus = sciName.toLowerCase().split(' ')[0];

	const search_NCBI_url = `https://api.ncbi.nlm.nih.gov/datasets/v2/taxonomy/dataset_report`;
	const NCBI_body = {'taxons':[`${sciName}`]};
	const NCBI_header = {headers: {'api-key': api_key}};

	// Check for valid taxon magnitude search
	return axios.get(phylopic_url+search_phylopic_tag+species).then(res => { // Search by species
		if (res.data.totalItems == 0) {
			return axios.post(search_NCBI_url, NCBI_body, NCBI_header).then((res) => { // Search NCBI for more info
				const classification = res.data.reports[0].taxonomy.classification;
				return axios.get(phylopic_url+search_phylopic_tag+classification.family.name.toLowerCase()).then((res) => { // Search by family
					if (res.data.totalItems == 0) {
						return axios.get(phylopic_url+search_phylopic_tag+classification.order.name.toLowerCase()).then((res) => { // Search by order
							if (res.data.totalItems == 0) {
								return axios.get(phylopic_url+search_phylopic_tag+classification.class.name.toLowerCase()).then((res) => { // Search by class
									if (res.data.totalItems == 0) {
										return axios.get(phylopic_url+search_phylopic_tag+classification.phylum.name.toLowerCase()).then((res) => { // Search by phylum
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