export function addLinkCardIfNecessary({
  uri,
  textBeforeCursor,
  mayBePaste,
  onNewLink,
  prevAddedLinks,
  endIndex,
}: {
  uri: string
  textBeforeCursor: string
  mayBePaste: boolean
  onNewLink: (uri: string) => void
  prevAddedLinks: Set<string>
  endIndex: number
}) {
  const isLeavingLink =
    endIndex === textBeforeCursor.length - 2 ||
    (endIndex === textBeforeCursor.length - 1 &&
      /[^.,;!?]\s$/m.test(textBeforeCursor))

  if (!mayBePaste && !isLeavingLink) {
    return
  }

  // Checking previouslyAddedLinks keeps a card from getting added over and over i.e.
  // Link card added -> Remove link card -> Press back space -> Press space -> Link card added -> and so on

  // We use the isValidUrl regex below because we don't want to add embeds only if the url is valid, i.e.
  // http://facebook is a valid url, but that doesn't mean we want to embed it. We should only embed if
  // the url is a valid url _and_ domain. new URL() won't work for this check.
  const shouldCheck = !prevAddedLinks.has(uri) && isValidUrlAndDomain(uri)

  if (shouldCheck) {
    onNewLink(uri)
    prevAddedLinks.add(uri)
  }
}

// https://stackoverflow.com/questions/8667070/javascript-regular-expression-to-validate-url
// question credit Muhammad Imran Tariq https://stackoverflow.com/users/420613/muhammad-imran-tariq
// answer credit Christian David https://stackoverflow.com/users/967956/christian-david
function isValidUrlAndDomain(value: string) {
  return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(
    value,
  )
}
