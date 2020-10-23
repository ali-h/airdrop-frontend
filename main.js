let json = {
  "contractName": "airdrops",
  "contractAction": "newAirdrop",
  "contractPayload": {
    "symbol": "",
    "type": "",
    "list": [],
  }
};
function getErrorText (arr) {
  let error_text = '';
  $.each(arr, function (i, { 0:line, 1:text }) {
    error_text += `Err: Line ${line} at "${text}"\n`;
  });
  return error_text;
}
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
  if (type === 'unimportant') {
    element.addClass('text-secondary');
    element.removeClass('text-danger');
    element.removeClass('text-primary');
    element.removeClass('text-success');
    element.text(message)
  }
  else if (type === 'message') {
    element.addClass('text-primary');
    element.removeClass('text-secondary');
    element.removeClass('text-danger');
    element.removeClass('text-success');
    element.text(message)
  }
  else if (type === 'success') {
    element.addClass('text-success');
    element.removeClass('text-secondary');
    element.removeClass('text-danger');
    element.removeClass('text-primary');
    element.text(message)
  }
  else if (type === 'failure') {
    element.addClass('text-danger');
    element.removeClass('text-secondary');
    element.removeClass('text-primary');
    element.removeClass('text-success');
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
    $( this ).prop("disabled", true);
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
        errors: [],
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
        else airdrop.errors.push([i + 1, list[i]]);
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
      else {
        setStatus($( "#next_status" ), 'failure', 'Error while parsing list, try again.');
        let errors = getErrorText(airdrop.errors);
        setStatus($( "#next_error_info" ), 'failure', errors);
        $( this ).prop("disabled", false);
      }
    }
    else {
      setStatus($( "#next_status" ), 'failure', 'Wrong parameters. try again.');
      $( this ).prop("disabled", false);
    }
  });
  $( "#json_body" ).on("show.bs.collapse", () => $( "#show_json" ).text('Hide JSON'));
  $( "#json_body" ).on("hide.bs.collapse", () => $( "#show_json" ).text('Show JSON'));
  $( "#json_body" ).on("shown.bs.collapse", function() {
    $( "html, body" ).animate({
      scrollTop: $( this) .offset().top,
    }, 500);
  });
  $( "#toggle_json" ).click(function() {
    if ($( this ).text() === 'stringify') {
      $( "#json" ).text(JSON.stringify(json));
      $( this ).text("parse");
    }
    else if ($( this ).text() === 'parse') {
      $( "#json" ).text(JSON.stringify(json, null, '  '));
      $( this ).text("stringify");
    }
    $( "#copy_json" ).text("copy");
  });
  $( "#copy_json" ).click(function() {
    const temp = $( "<textarea>" );
    $( "body" ).append(temp);
    console.log($( "#json" ).text())
    temp.val($( "#json" ).text()).select();
    document.execCommand("copy");
    temp.remove();
    $( this ).text("copied");
  });
  $( "#confirm" ).click(function() {
    setStatus($( "#confirm_error_info" ), 'message', '');
    const username = $( "#username" ).val();
    if (username && isValidAccountName(username)) {
      $( this ).prop("disabled", true);
      try {
        hive_keychain.requestHandshake(() => {
          setStatus($( "#confirm_status" ), 'success', 'Now broadcasting...');
          hive_keychain.requestCustomJson(username,
            'ssc-mainnet-hive',
            'Posting',
            JSON.stringify(json),
            'Initiate a new Airdrop',
            ({ error, result, message }) => {
              if (error) {
                setStatus($( "#confirm_status" ), 'failure', 'An error occurred, try again.');
                setStatus($( "#confirm_error_info" ), 'failure', `Err ${error}: ${message}`);
                $( this ).prop("disabled", false);
                return;
              }
              setStatus($( "#confirm_status" ), 'success', 'Broadcasted Successfully.');
              setStatus($( "#confirm_error_info" ), 'message',
                `blockNumber: ${result.block_num}\nid: ${result.id}`);
              // setStatus($( "#airdrop_status" ), 'unimportant',
              //   `Now looking for status (${attempt})`);
            });
        });
      }
      catch(e) {
        setStatus($( "#confirm_status" ), 'failure', 'Hive Keychain not installed. try again.');
        $( this ).prop("disabled", false);
      }
    }
    else {
      setStatus($( "#confirm_status" ), 'failure', 'Invalid username. try again.');
    }
  });
});