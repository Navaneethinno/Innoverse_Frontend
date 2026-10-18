// A stored customer file path, as upload returns it
// ("institution/2/customer/corporate/<ref>/document/front_file_….png").
export const isStoredCustomerFile = (value) => typeof value === "string" && /^institution\/\d+\/customer\//.test(value);
