let json = {
  "contractName": "airdrops",
  "contractAction": "newAirdrop",
  "contractPayload": {
    "symbol": "",
    "type": "",
    "list": [],
  }
};
function isValidAccountName (name) {
  if (!name) return false;
  if (typeof name !== 'string') return false;
  if (name.length < 3) return false;
  if (name.length > 16) return false;
  const ref = name.split('.');
  for (let i = 0; i < ref.length; i += 1) {
    const label = ref[i];
    if (label.length < 3) return false;
    if (!/^[a-z]/.test(label)) return false;
    if (!/^[a-z0-9-]*$/.test(label)) return false;
    if (/--/.test(label)) return false;
    if (!/[a-z0-9]$/.test(label)) return false;
  }
  return true;
}
function setStatus (element, type, message) {
  if (type === 'message') {
    element.addClass('text-primary')
    element.removeClass('text-danger')
    element.removeClass('text-success')
    element.text(message)
  }
  else if (type === 'success') {
    element.addClass('text-success')
    element.removeClass('text-danger')
    element.removeClass('text-primary')
    element.text(message)
  }
  else if (type === 'failure') {
    element.addClass('text-danger')
    element.removeClass('text-primary')
    element.removeClass('text-success')
    element.text(message)
  }
}
$( document ).ready(function() {
  $( "#list_file" ).change(function() {
    const file = $( this ).prop('files')[0];
    const fr = new FileReader();
    fr.readAsText(file);
    fr.onload = (e) => {
      $( "#list" ).val(e.target.result);
      $( "#list" ).prop("disabled", true);
    };
  });
  $( "#next" ).click(function() {
    const symbol = ( $( "#symbol" ).val() ).toUpperCase();
    const type = $( "#type" ).val();
    const list = $( "#list" ).val();
    if (symbol && typeof symbol === 'string' && symbol.length >= 3
      && type && typeof type === 'string'
      && (type.toLocaleLowerCase() ==='transfer' || type.toLocaleLowerCase() === 'stake')
      && list && typeof list === 'string') {
      const airdrop = {
        symbol,
        type: type.toLowerCase(),
        list: [],
        fee: 0,
        quantity: 0,
        isValid: false,
      };
      const list = $( "#list" ).val().split('\n');
      for (let i = 0; i < list.length; i += 1) {
        const { 0:to, 1:quantity } = list[i].split(',');
        if (to && isValidAccountName(to)
          && quantity && !BigNumber(quantity).isNaN()
          && BigNumber(quantity).gt(0) && BigNumber(quantity).dp() <= 8) {
          airdrop.list.push([
            to,
            quantity,
          ]);
          airdrop.quantity = BigNumber(airdrop.quantity).plus(quantity).toString();
        }
      }
      airdrop.fee = BigNumber(0.1).times(airdrop.list.length).toString();
      if (list.length > 0 && airdrop.list.length === list.length) airdrop.isValid = true;
      if (airdrop.isValid) {
        json.contractPayload.symbol = airdrop.symbol;
        json.contractPayload.type = airdrop.type;
        json.contractPayload.list = airdrop.list;
        $( "#next_container" ).addClass("d-none");
        $( "#confirm_container" ).removeClass("d-none");
        $( "#symbol_locked" ).val(airdrop.symbol);
        $( "#type_locked" ).val(type);
        $( "#fee_locked" ).val(`${airdrop.fee} BEE`);
        $( "#quantity_locked" ).val(`${airdrop.quantity} ${symbol}`);
        $( "#accounts_locked" ).val(`${airdrop.list.length}`);
        $( "#json" ).text(JSON.stringify(json, null, '  '));
      }
      else setStatus($( "#next_status" ), 'failure', 'Error while parsing list, try again.');
    }    
    else setStatus($( "#next_status" ), 'failure', 'Wrong parameters. try again.');
  });
  $( "#json_body" ).on("shown.bs.collapse", function() {
    $( "html, body" ).animate({
      scrollTop: $( "#json_body") .offset().top,
    }, 500);
  });
});