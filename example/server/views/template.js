const template = (podlets = []) => {
    return `
        <div class="container">
            <div class="row">
                <div class="col-12">
                    ${podlets[0].content}
                </div>
            </div>
            <div class="row">
                <div class="col-4">
                    ${podlets[1].content}
                </div>
                <div class="col-8">
                    ${podlets[2].content}
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    ${podlets[3].content}
                </div>
            </div>
        </div>`;
};
export default template;
