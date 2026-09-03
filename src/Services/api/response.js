export function unwrapApiResponse(response, fallback) {
  if (
    response !== null &&
    typeof response === "object" &&
    "success" in response &&
    "data" in response
  ) {
    const data = response.data;
    return data ?? fallback;
  }
  return response ?? fallback;
}
